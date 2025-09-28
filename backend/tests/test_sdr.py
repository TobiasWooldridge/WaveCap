import asyncio
import math

import numpy as np
import pytest

from wavecap_backend.sdr import (
    _AMDemodDecimator,
    _ChannelDemod,
    _FMDemodDecimator,
    SdrManager,
)


def test_fm_demodulator_recovers_constant_frequency() -> None:
    input_rate = 16000
    audio_rate = 16000
    tone_hz = 400
    phase_step = 2 * math.pi * tone_hz / input_rate
    samples = np.arange(input_rate, dtype=np.float32)
    iq = np.exp(1j * phase_step * samples).astype(np.complex64)
    demod = _FMDemodDecimator(input_rate, audio_rate, audio_cutoff_hz=3800.0)
    audio = demod.process(iq)
    # Mean of FM discriminator output should track phase step
    assert audio.size == iq.size
    steady_state = float(np.mean(audio[200:]))
    assert math.isclose(steady_state, phase_step, rel_tol=0.05)


def test_am_demodulator_extracts_envelope() -> None:
    input_rate = 48000
    audio_rate = 16000
    t = np.arange(input_rate, dtype=np.float32) / input_rate
    envelope = 0.5 * np.sin(2 * math.pi * 1000 * t)  # 1 kHz tone
    carrier = np.exp(1j * 2 * math.pi * 10000 * t)
    iq = (1.0 + envelope) * carrier
    demod = _AMDemodDecimator(input_rate, audio_rate, audio_cutoff_hz=5000.0)
    audio = demod.process(iq.astype(np.complex64))
    assert audio.size > 0
    # Normalised output should preserve waveform shape
    peak = float(np.max(np.abs(audio)))
    assert 0.4 < peak <= 1.0
    # Dominant frequency near 1 kHz
    spectrum = np.fft.rfft(audio)
    freqs = np.fft.rfftfreq(audio.size, d=1.0 / audio_rate)
    dominant_hz = float(freqs[np.argmax(np.abs(spectrum))])
    assert math.isclose(dominant_hz, 1000.0, rel_tol=0.1)


def test_channel_squelch_hysteresis() -> None:
    demod = _ChannelDemod(
        stream_id="test",
        input_rate=240000,
        audio_rate=16000,
        abs_frequency_hz=156_800_000,
        center_frequency_hz=156_800_000,
        mode="nfm",
        bandwidth_hz=15000,
        squelch_dbfs=-40.0,
    )
    assert demod._squelch_open is False  # type: ignore[attr-defined]
    assert demod._squelch_allows(-80.0) is False  # type: ignore[attr-defined]
    assert demod._squelch_open is False  # type: ignore[attr-defined]
    assert demod._squelch_allows(-30.0) is True  # type: ignore[attr-defined]
    assert demod._squelch_open is True  # type: ignore[attr-defined]
    # Should stay open until it drops below close threshold (-43 dBFS)
    assert demod._squelch_allows(-41.0) is True  # type: ignore[attr-defined]
    assert demod._squelch_allows(-50.0) is False  # type: ignore[attr-defined]
    assert demod._squelch_open is False  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_manager_status_reports_configured_devices() -> None:
    manager = SdrManager()
    manager.configure_device(
        "dev1",
        "driver=test",
        240000,
        gain_db=30.0,
        gain_mode="manual",
        rf_bandwidth_hz=200000.0,
        antenna="RX",
        ppm_correction=-1.2,
        lo_offset_hz=100000.0,
    )
    status = await manager.get_status()
    assert status["configuredDevices"]
    device = status["configuredDevices"][0]
    assert device["deviceId"] == "dev1"
    assert device["gainMode"] == "manual"
