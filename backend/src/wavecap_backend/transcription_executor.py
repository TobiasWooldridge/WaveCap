from __future__ import annotations

import asyncio
import queue
import threading
from dataclasses import dataclass
from typing import Callable, Generic, Optional, TypeVar

__all__ = ["TranscriptionExecutor"]

T = TypeVar("T")


@dataclass
class _ExecutorJob(Generic[T]):
    """Container holding the work callable and its awaiting future."""

    func: Callable[[], T]
    future: asyncio.Future[T]


class TranscriptionExecutor:
    """Runs blocking transcription work on a dedicated pool of threads."""

    def __init__(self, *, worker_count: int, queue_size: int) -> None:
        if worker_count <= 0:
            raise ValueError("worker_count must be positive")
        if queue_size <= 0:
            raise ValueError("queue_size must be positive")
        self._worker_count = worker_count
        self._queue: "queue.Queue[Optional[_ExecutorJob[object]]]" = queue.Queue(
            maxsize=queue_size
        )
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._threads: list[threading.Thread] = []
        self._started = False
        self._closing = False
        self._lock = threading.Lock()

    async def start(self) -> None:
        """Initialise thread pool workers bound to the current loop."""

        loop = asyncio.get_running_loop()
        with self._lock:
            if self._started:
                if self._loop is not loop:
                    raise RuntimeError("Executor already bound to a different loop")
                return
            self._loop = loop
            self._started = True
            for index in range(self._worker_count):
                thread = threading.Thread(
                    target=self._worker_loop,
                    name=f"transcription-executor-{index}",
                    daemon=True,
                )
                thread.start()
                self._threads.append(thread)

    async def run(self, func: Callable[[], T]) -> T:
        """Schedule *func* on the executor and await its result."""

        if not self._started or self._loop is None:
            raise RuntimeError("TranscriptionExecutor has not been started")
        if self._closing:
            raise RuntimeError("TranscriptionExecutor is shutting down")

        loop = asyncio.get_running_loop()
        if loop is not self._loop:
            raise RuntimeError("TranscriptionExecutor bound to a different loop")

        future: asyncio.Future[T] = loop.create_future()
        job: _ExecutorJob[T] = _ExecutorJob(func=func, future=future)
        await self._enqueue_job(job)
        return await future

    async def close(self) -> None:
        """Signal workers to exit and wait for them to finish."""

        with self._lock:
            if not self._started or self._closing:
                self._closing = True
            else:
                self._closing = True
        if not self._threads:
            return
        for _ in range(len(self._threads)):
            await self._enqueue_sentinel()
        await asyncio.gather(*(asyncio.to_thread(thread.join) for thread in self._threads))
        self._threads.clear()

    async def _enqueue_job(self, job: _ExecutorJob[T]) -> None:
        while True:
            if self._closing:
                raise RuntimeError("TranscriptionExecutor is shutting down")
            try:
                self._queue.put(job, block=False)
            except queue.Full:
                await asyncio.sleep(0.01)
                continue
            else:
                return

    async def _enqueue_sentinel(self) -> None:
        while True:
            try:
                self._queue.put(None, block=False)
            except queue.Full:
                await asyncio.sleep(0.01)
                continue
            else:
                return

    def _worker_loop(self) -> None:
        loop = self._loop
        assert loop is not None
        while True:
            job = self._queue.get()
            if job is None:
                break
            try:
                result = job.func()
            except BaseException as exc:  # pragma: no cover - propagate to loop
                loop.call_soon_threadsafe(self._reject_future, job.future, exc)
            else:
                loop.call_soon_threadsafe(self._resolve_future, job.future, result)

    @staticmethod
    def _resolve_future(future: asyncio.Future[T], result: T) -> None:
        if future.cancelled():
            return
        if not future.done():
            future.set_result(result)

    @staticmethod
    def _reject_future(future: asyncio.Future[T], exc: BaseException) -> None:
        if future.cancelled():
            return
        if not future.done():
            future.set_exception(exc)
