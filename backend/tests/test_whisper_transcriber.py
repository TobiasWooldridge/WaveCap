import asyncio
import time
from types import SimpleNamespace

import numpy as np
import pytest

from wavecap_backend.models import WhisperConfig
from wavecap_backend import whisper_transcriber as module


class _GpuThenCpuModel:
    init_kwargs = []
    init_args = []

    @classmethod
    def reset(cls) -> None:
        cls.init_kwargs = []
        cls.init_args = []

    def __init__(self, *_args, **kwargs):
        type(self).init_args.append(tuple(_args))
        type(self).init_kwargs.append(dict(kwargs))
        device = kwargs.get("device")
        if device == "cpu":
            self.device = device
            self.compute_type = kwargs.get("compute_type")
            return
        raise RuntimeError("cuDNN not found")

    def transcribe(self, *_args, **_kwargs):
        return [], SimpleNamespace(language="en")


class _GpuAndCpuFailingModel:
    def __init__(self, *_args, **kwargs):
        if kwargs.get("device") == "cpu":
            raise RuntimeError("CPU fallback not available")
        raise RuntimeError("cuDNN not found")


class _SlowModel:
    sleep_seconds = 0.1

    def __init__(self, *_args, **_kwargs):
        pass

    def transcribe(self, *_args, **_kwargs):
        time.sleep(self.sleep_seconds)
        segment = SimpleNamespace(
            id=0,
            text=" hello",
            no_speech_prob=0.2,
            temperature=0.0,
            avg_logprob=-0.3,
            compression_ratio=0.1,
            start=0.0,
            end=1.0,
            seek=0,
        )
        info = SimpleNamespace(
            language="en",
            no_speech_prob=segment.no_speech_prob,
            avg_logprob=segment.avg_logprob,
        )
        return [segment], info


class _NoTemperatureIncrementModel:
    transcribe_calls = []

    @classmethod
    def reset(cls) -> None:
        cls.transcribe_calls = []

    def __init__(self, *_args, **_kwargs):
        pass

    def transcribe(
        self,
        audio,
        *,
        language=None,
        task=None,
        beam_size=None,
        temperature=None,
        condition_on_previous_text=None,
        without_timestamps=None,
        initial_prompt=None,
    ):
        type(self).transcribe_calls.append(
            {
                "language": language,
                "task": task,
                "beam_size": beam_size,
                "temperature": temperature,
                "condition_on_previous_text": condition_on_previous_text,
                "without_timestamps": without_timestamps,
                "initial_prompt": initial_prompt,
            }
        )
        segment = SimpleNamespace(
            id=0,
            text=" hi",
            no_speech_prob=0.1,
            temperature=0.0,
            avg_logprob=-0.1,
            compression_ratio=0.0,
            start=0.0,
            end=1.0,
            seek=0,
        )
        info = SimpleNamespace(
            language=language or "en",
            no_speech_prob=segment.no_speech_prob,
            avg_logprob=segment.avg_logprob,
        )
        return [segment], info


def test_preload_gpu_failure_falls_back_to_cpu(monkeypatch):
    _GpuThenCpuModel.reset()
    monkeypatch.setattr(module, "WhisperModel", _GpuThenCpuModel)
    monkeypatch.setattr(
        module.WhisperTranscriber,
        "_gpu_runtime_available",
        lambda self: True,
    )
    config = WhisperConfig(model="large-v3-turbo", cpuFallbackModel="base")

    transcriber = module.WhisperTranscriber(config)

    assert len(_GpuThenCpuModel.init_kwargs) == 2
    assert _GpuThenCpuModel.init_args[0][0] == "large-v3-turbo"
    assert _GpuThenCpuModel.init_args[1][0] == "base"
    assert _GpuThenCpuModel.init_kwargs[1]["device"] == "cpu"
    assert _GpuThenCpuModel.init_kwargs[1]["compute_type"] == "float32"
    assert isinstance(transcriber._model, _GpuThenCpuModel)
    assert transcriber._model.device == "cpu"


async def _run_transcribe(transcriber: module.WhisperTranscriber) -> None:
    await transcriber.transcribe(np.zeros(16000, dtype=np.float32), 16000, None)


def test_lazy_initialization_gpu_failure_recovers_with_cpu(monkeypatch):
    _GpuThenCpuModel.reset()
    monkeypatch.setattr(module, "WhisperModel", _GpuThenCpuModel)
    monkeypatch.setattr(
        module.WhisperTranscriber,
        "_gpu_runtime_available",
        lambda self: True,
    )
    config = WhisperConfig(model="small", cpuFallbackModel=None)
    transcriber = module.WhisperTranscriber(config, preload_model=False)

    asyncio.run(_run_transcribe(transcriber))

    assert len(_GpuThenCpuModel.init_kwargs) == 2
    assert _GpuThenCpuModel.init_args[0][0] == "small"
    assert _GpuThenCpuModel.init_args[1][0] == "small"
    assert _GpuThenCpuModel.init_kwargs[1]["device"] == "cpu"
    assert isinstance(transcriber._model, _GpuThenCpuModel)


def test_initialization_fails_when_cpu_unavailable(monkeypatch):
    monkeypatch.setattr(module, "WhisperModel", _GpuAndCpuFailingModel)
    config = WhisperConfig(model="base")

    with pytest.raises(RuntimeError) as excinfo:
        module.WhisperTranscriber(config)

    assert "Failed to initialize Whisper model" in str(excinfo.value)


@pytest.mark.asyncio
async def test_concurrent_transcriptions_do_not_block_event_loop(monkeypatch):
    monkeypatch.setattr(module, "WhisperModel", _SlowModel)
    config = WhisperConfig(model="slow", maxConcurrentProcesses=2)
    transcriber = module.WhisperTranscriber(config)
    audio = np.zeros(16000, dtype=np.float32)

    start = time.perf_counter()
    await asyncio.gather(
        transcriber.transcribe(audio, 16000, None),
        transcriber.transcribe(audio, 16000, None),
    )
    duration = time.perf_counter() - start
    assert duration < _SlowModel.sleep_seconds * 1.8


@pytest.mark.asyncio
async def test_transcription_leaves_room_for_websocket_acks(monkeypatch):
    monkeypatch.setattr(module, "WhisperModel", _SlowModel)
    config = WhisperConfig(model="slow", maxConcurrentProcesses=2)
    transcriber = module.WhisperTranscriber(config)
    audio = np.zeros(16000, dtype=np.float32)

    ack_event = asyncio.Event()
    ack_times: list[float] = []

    async def simulate_ack() -> None:
        await asyncio.sleep(0.01)
        ack_times.append(time.perf_counter())
        ack_event.set()

    start = time.perf_counter()
    ack_task = asyncio.create_task(simulate_ack())
    transcription_tasks = [
        asyncio.create_task(transcriber.transcribe(audio, 16000, None))
        for _ in range(2)
    ]

    await asyncio.wait_for(ack_event.wait(), timeout=_SlowModel.sleep_seconds * 5)
    ack_delay = ack_times[0] - start
    assert ack_delay < _SlowModel.sleep_seconds
    assert any(not task.done() for task in transcription_tasks)

    await asyncio.gather(*transcription_tasks)
    await ack_task


@pytest.mark.asyncio
async def test_transcriber_skips_unknown_temperature_increment_kw(monkeypatch):
    _NoTemperatureIncrementModel.reset()
    monkeypatch.setattr(module, "WhisperModel", _NoTemperatureIncrementModel)
    config = WhisperConfig(
        model="no-temp-increment",
        temperatureIncrementOnFallback=0.5,
    )
    transcriber = module.WhisperTranscriber(config)

    await transcriber.transcribe(np.zeros(16000, dtype=np.float32), 16000, None)

    assert len(_NoTemperatureIncrementModel.transcribe_calls) == 1
    call_kwargs = _NoTemperatureIncrementModel.transcribe_calls[0]
    assert call_kwargs["language"] == config.language
    assert call_kwargs["task"] == "transcribe"
    assert "temperature_increment_on_fallback" not in call_kwargs
