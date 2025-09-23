import numpy as np

from wavecap_backend.audio_processing import (
    AudioFrontEndConfig,
    AudioFrontEndProcessor,
)


def test_audio_frontend_highpass_tracks_dc_offset() -> None:
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=250.0,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=None,
    )
    processor = AudioFrontEndProcessor(config)
    samples = np.full(32000, 0.2, dtype=np.float32)
    processed = processor.process(samples)
    steady_state = processed[2000:]
    assert abs(float(np.mean(steady_state))) < 1e-3


def test_audio_frontend_agc_boosts_quiet_signal() -> None:
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=0.05,
        agc_max_gain=8.0,
    )
    processor = AudioFrontEndProcessor(config)
    samples = np.full(4000, 0.005, dtype=np.float32)
    processed = processor.process(samples, target_rms=0.05)
    rms = float(np.sqrt(np.mean(np.square(processed))))
    assert rms > 0.02
