import asyncio

import pytest

from wavecap_backend.transcription_executor import TranscriptionExecutor


@pytest.mark.asyncio
async def test_transcription_executor_runs_jobs():
    executor = TranscriptionExecutor(worker_count=2, queue_size=4)
    await executor.start()
    try:
        results = await asyncio.gather(
            executor.run(lambda: 1 + 1),
            executor.run(lambda: 2 + 3),
        )
    finally:
        await executor.close()
    assert results == [2, 5]


@pytest.mark.asyncio
async def test_transcription_executor_rejects_after_close():
    executor = TranscriptionExecutor(worker_count=1, queue_size=2)
    await executor.start()
    await executor.close()
    with pytest.raises(RuntimeError):
        await executor.run(lambda: 42)
