# Configuration & Transcription Tuning Guide

This project keeps runtime settings alongside the backend code and in the `state/` directory. Up to three configuration files are read at startup (in this order):

- `backend/default-config.yaml` – shipping defaults that should be kept under version control. The YAML file includes inline comments that explain each Whisper tuning knob right next to the value.
- (Optional) `state/default-config.yaml` – a deployment-specific defaults file. If present, it loads after `backend/default-config.yaml` but before `state/config.yaml`.
- `state/config.yaml` – optional overrides for your environment. When the file is missing, the backend copies `backend/default-config.yaml`, preserves the inline notes, and rotates any placeholder secrets (pager webhook tokens, shared passwords) before writing it to disk.

YAML supports inline comments, so feel free to document why a value was chosen directly inside the file. On first launch, the generated `state/config.yaml` is a verbatim copy of the shipped defaults with fresh secrets already substituted, so operators can tweak the file immediately without exposing repository placeholders in production.

Preload audio feeds by editing the shared `streams` list inside any of the configuration files above. Overrides replace the previously defined list, so set it to an empty array when you want a deployment to start without predefined streams.

## Combined stream views

The `combinedStreamViews` list defines virtual streams that merge transcripts from two or more existing pager or audio feeds. These views appear in the UI alongside the physical streams, allowing operators to monitor busy channels from a single conversation pane.

```yaml
combinedStreamViews:
  - id: metro-dispatch
    name: Metro dispatch summary
    description: Aggregates the primary city and statewide Broadcastify feeds.
    streamIds:
      - broadcastify-2653
      - broadcastify-34010
```

- `id`: Unique identifier for the virtual view.
- `name`: Label shown in the sidebar and conversation header.
- `description` *(optional)*: Extra context rendered beneath the header when the view is selected.
- `streamIds`: Array of existing stream IDs to merge. Provide at least one ID; invalid or missing IDs are highlighted in the UI so you can correct the configuration.

Combined views are read-only in the interface—start/stop, rename, and reset actions remain reserved for the underlying streams.

## How configuration is merged

1. Built-in defaults compiled into the backend provide a safe baseline if no files are present.
2. `backend/default-config.yaml` is loaded to replace those built-ins.
3. `state/default-config.yaml` is loaded (if it exists) to customise the shared defaults for a particular deployment.
4. `state/config.yaml` is loaded last and overrides any matching fields.

Missing files are ignored with a warning; the backend falls back to earlier layers.

## Server binding

The `server` block controls where the backend listens and which browser origin is
allowed to load the frontend when running from a different host.

```yaml
server:
  host: 0.0.0.0
  port: 8000
  corsOrigin: "*"
```

- `host`: IP or hostname that `uvicorn` should bind to. The default (`0.0.0.0`)
  listens on all interfaces so you can reach the app from other devices on the
  network.
- `port`: TCP port for HTTP and WebSocket traffic. Change it when another
  service already occupies `8000`.
- `corsOrigin`: Browser origin allowed to access the API when the frontend runs
  elsewhere. Keep it at `*` when serving the bundled frontend from the same
  origin.

## Pager feeds

Some agencies publish pager updates without a backing audio stream. Add these sources as *pager* streams in your configuration files by setting `source: pager` and providing a `webhookToken` under the `streams` list. The backend exposes a token-protected webhook at `/api/pager-feeds/<streamId>?token=<token>`; POST JSON with at least a `message` field (plus optional `sender`, `details`, or `priority`) and the text appears instantly in the UI alongside audio transcripts. Tokens persist in `state/runtime.sqlite`; delete and recreate the stream entry if you ever need to rotate the token.

```yaml
streams:
  - id: city-pager
    name: City pager feed
    source: pager
    webhookToken: super-secret-token
```

Pager streams always run in real time, so `enabled` and `ignoreFirstSeconds` are ignored. Provide a `url` only when you need to serve the webhook from a custom path instead of the default `/api/pager-feeds/<streamId>` route.

When the backend scaffolds `state/config.yaml` it copies the shipped pager examples and swaps any `webhookToken: replace-me`
placeholders with unique, random tokens so you can use the webhook immediately without editing secrets by hand.

When the CAD system emits a known structured payload, add `&format=<name>` to the webhook URL so the backend can normalise it automatically. For example, South Australia CFS Flex dispatch posts can be delivered with `&format=cfs-flex`, allowing the backend to extract the incident number, address, alarm level, talkgroup, and supporting details without requiring a separate middleware script.

## Audio stream pre-roll trimming

Dispatch providers such as Broadcastify play an advertisement or dial tone before the feed goes live. The backend automatically skips the first 30 seconds for Broadcastify feeds when no override is provided so operators are never greeted by the ad. Set `ignoreFirstSeconds` on any audio stream to customise the pre-roll trimming window. Configure the value in `streams` or via `state/config.yaml`. A value of `30` skips the first half-minute, which matches the Broadcastify ad length.

```yaml
streams:
  - id: broadcastify-2653
    name: Broadcastify Stream 2653
    url: https://broadcastify.cdnstream1.com/2653
    ignoreFirstSeconds: 30
```

Leave the field at `0` (or omit it) to ingest audio from the very beginning.

## Pinned streams

Highlight critical feeds by marking them as pinned. Pinned streams always
appear at the top of the sidebar and management lists, ahead of any other
sorting rules. Set `pinned: true` on any entry in `streams` (or in
`state/config.yaml`) to keep it at the top:

```yaml
streams:
  - id: dispatch-primary
    name: Primary dispatch
    url: https://radio.example.net/live
    enabled: true
    pinned: true
```

Leave the field out or set it to `false` for feeds that should follow the
selected sort order.

## Logging

The `logging` block controls whether backend console output and forwarded frontend messages are written to disk. By default both
targets append to their existing files (`clearOnStart: false`) so restarts do not erase context that operators may need to audit
gaps in coverage. Override a single side or set `clearOnStart` to `true` if you want a clean slate on every boot.

```yaml
logging:
  enabled: true
  backend:
    enabled: true
    clearOnStart: false
    fileName: backend.log
  frontend:
    enabled: true
    clearOnStart: false
    fileName: frontend.log
```

## Access control

The `access` section defines who can administer the workspace. The shipping configuration includes a single editor credential:

```yaml
access:
  defaultRole: read_only
  tokenTtlMinutes: 1440
  credentials:
    -
      password: change-me
      role: editor
```

- `defaultRole`: Role granted to unauthenticated visitors. Keep it at `read_only` for public dashboards or raise it to `editor`
  when the deployment sits behind another authentication layer.
- `tokenTtlMinutes`: Optional session duration in minutes. Set it to `null` (or remove the field) for non-expiring tokens.
- `credentials`: List of shared passwords. Each entry accepts an optional `identifier` for deployments that integrate with a
  custom sign-in form. The bundled frontend only prompts for the password, so leave `identifier` unset unless you handle the
  extra field yourself. When the backend scaffold copies `backend/default-config.yaml` into `state/config.yaml`, any `change-me`
  placeholders are replaced with a random password so every deployment starts with a unique shared secret.

## UI defaults

The `ui` section seeds initial browser preferences for new operators. The values apply
when the browser does not already have a saved preference in `localStorage`; future
changes made in the UI continue to persist per browser. Adjust the defaults to match
your deployment before sharing the workspace URL with a team.

```yaml
ui:
  themeMode: system
  colorCodingEnabled: false
  transcriptCorrectionEnabled: false
  reviewExportStatuses:
    - corrected
    - verified
  # Optional API key for richer Google Maps embeds shown in pager views.
  # When unset, the UI falls back to a basic public embed. Create a key with
  # the Google Maps Embed API enabled and restrict it to your site origin.
  # googleMapsApiKey: YOUR_EMBED_API_KEY
  # Optional regional hint appended to partial addresses when building
  # Google Maps links/embeds in the UI. Useful when pager messages omit
  # the state or country.
  # baseLocation:
  #   state: SA
  #   country: AU
```

- `themeMode`: Choose between `light`, `dark`, or `system` to match the operating system.
- `colorCodingEnabled`: Turn on transcript confidence colouring by default.
- `transcriptCorrectionEnabled`: Reveal review/editing controls on first load.
- `reviewExportStatuses`: Pre-select the review states included in the ZIP export.
- `baseLocation` (optional): Provide `state` and/or `country` so the UI can
  append them to incomplete addresses when constructing Google Maps embeds and
  links. This helps disambiguate locations without requiring full addresses in
  pager messages.
- `googleMapsApiKey` (optional): Supply a Google Maps Embed API key to enable
  the richer, authenticated map preview inside the pager address dialog. When
  omitted, the UI uses a basic public embed which may lack some features.

## Stream-level base location

When different streams cover different regions, set a per-stream base location
to improve Google Maps results for partial addresses:

```yaml
streams:
  - id: broadcastify-2653
    name: SA SES Radio
    url: https://broadcastify.cdnstream1.com/2653
    baseLocation:
      state: SA
      country: AU
  - id: broadcastify-34010
    name: NSW - Primary Emergency Services
    url: https://broadcastify.cdnstream1.com/34010
    baseLocation:
      state: NSW
      country: AU
  - id: sa-ses-pager
    name: SA SES Pager Gateway
    source: pager
    webhookToken: <token>
    baseLocation:
      state: SA
      country: AU
```

The UI prefers the stream’s `baseLocation` when present; otherwise it falls back
to the global `ui.baseLocation` if configured.

## Keyword alerts

Use the `alerts` block to surface high-priority phrases with a banner and optional chime. The defaults ship with
distress calls such as "Mayday" and "Pan-Pan" so operators get an immediate visual cue when the phrases are heard.

```yaml
alerts:
  enabled: true
  rules:
    - id: distress-mayday
      label: "Distress: MAYDAY"
      phrases:
        - mayday
      playSound: true
```

Each rule must provide an `id` and at least one phrase. Optional fields customise the behaviour:

- `label`: Overrides the default message shown in the banner.
- `playSound`: Set to `false` to suppress the audio cue for a specific rule.
- `notify`: Set to `false` to skip the banner while still flagging the transcript in the UI.
- `caseSensitive`: Force an exact case match when required (defaults to case-insensitive).
- `enabled`: Disable a rule without removing it from the configuration.

Add multiple phrases to catch variations such as `"pan-pan"` and `"pan pan"`. When operators override the defaults,
the Settings dialog in the UI also exposes a **Keyword alerts** section. From there you can toggle individual rules,
adjust the phrases, and choose whether each rule plays a chime or only shows a banner. Updates made in the UI apply immediately for all connected browsers and persist until the backend restarts, but they are not written back to `state/config.yaml`. Edit the file directly when you need permanent changes.

## SDR devices and streams

WaveCap can ingest audio directly from a local SDR when available on the host machine. Devices are addressed via SoapySDR; for the SDRplay RSPdx install the SDRplay API and the `SoapySDRPlay3` module on the host or in the container, then define a device and one or more SDR-backed streams.

1) Register devices in a top-level `sdr.devices` list:

```yaml
sdr:
  devices:
    - id: rspdx
      soapy: "driver=sdrplay"   # SoapySDR device string
      sampleRateHz: 240000       # IQ rate; 240 kS/s works well for voice
      # gainDb: 40               # Optional fixed gain (dB)
      # gainMode: auto           # 'auto' enables device AGC when supported
      # rfBandwidthHz: 200000    # Optional hardware RF/IF bandwidth
      # antenna: "RX"            # Optional antenna selection
      # ppmCorrection: -0.8      # Optional frequency correction (ppm)
      # loOffsetHz: 250000       # Optional LO offset used when tuning
      # Note: The backend clamps LO offsets to keep the logical tuned
      # frequency within the observable passband for the configured
      # sample rate and requested channel bandwidth. As a rule of thumb,
      # choose a sampleRateHz such that: sampleRateHz ≥ (bandwidth + 2×|loOffsetHz|)
      # to avoid clipping or silence at the edges.
```

2) Add streams with `source: sdr` and a tuned frequency:

```yaml
streams:
  - id: marine-ch16-sdr
    name: Marine VHF Ch 16 (SDR)
    source: sdr
    sdrDeviceId: rspdx
    sdrFrequencyHz: 156800000
    sdrMode: nfm
    sdrBandwidthHz: 15000
    sdrSquelchDbFs: -65
    enabled: false
```

- `sdrDeviceId`: Must match a defined device under `sdr.devices`.
- `sdrFrequencyHz`: Absolute RF frequency to tune.
- Optional fields:
  - `sdrMode`: Demodulation mode (`nfm`, `wfm`, or `am`).
  - `sdrBandwidthHz`: Complex channel filter width prior to demodulation. Leave unset to pull default values for each mode.
  - `sdrSquelchDbFs`: Audio squelch threshold in dBFS (≤ 0). Suppresses low-level noise when no signal is present.
  - `loOffsetHz`: Applies a local-oscillator offset when tuning to move DC away from baseband. If set too large for the device
    sample rate and channel bandwidth, the backend automatically clamps it to a safe value so the desired channel remains inside
    the capture span and audio continues to flow.

### Inspecting SDR health

Call `GET /api/sdr/status` to review currently configured devices, their tuning state, IQ levels, and per-stream audio statistics. The endpoint returns both active devices (including RMS/peak measurements, center frequency, and squelch state) and configured-but-idle devices so you can verify SoapySDR detected the hardware.

Notes:
- SDR streams behave like regular audio streams in the UI and support `language` and `ignoreFirstSeconds` (default 0 for SDR).
- Multiple SDR streams on the same device are supported when the channels lie within the configured sample-rate span; the device is tuned to the average and each channel is mixed down and demodulated independently.
- When SoapySDR or the required plugin is not available, SDR streams will fail to start and report an error in the UI.

## Tuning Whisper transcription

The `whisper` object controls how OpenAI Whisper (via `@xenova/whisper`) processes audio. Use the following guidance to balance accuracy, latency, and resource usage.

### 1. Choose an appropriate model

| Model name        | Accuracy | Resource usage | Typical use case |
|-------------------|----------|----------------|------------------|
| `tiny` / `tiny.en`| Low      | Very low       | Embedded devices, CPU-only environments, quick drafts |
| `base` / `base.en`| Medium   | Low            | Default balance of speed and accuracy |
| `small`           | High     | Moderate (requires ~4 GB VRAM or fast CPU) | Higher accuracy when latency is less critical |
| `medium`          | Very high| High (GPU recommended) | Archival-quality transcripts |
| `large-v2`        | Maximum  | Very high (high-end GPU) | Great accuracy when real-time is not required |
| `large-v3`        | Maximum  | Very high (GPU recommended) | Latest large checkpoint with improved multilingual accuracy |
| `large-v3-turbo`  | Very high| High (GPU recommended) | Faster large-v3 variant that trades a little accuracy for latency |

The repository defaults now ship with `large-v3-turbo` so live transcripts stay accurate even on noisy dispatch channels. Expect downloads of several gigabytes and plan for a recent GPU (or a high-core-count CPU) to keep the model responsive.

Use the `.en` variants when you only need English—they are smaller and slightly faster.

> **Fallback behaviour:** When the faster-whisper runtime cannot start on a GPU (for example when CUDA or cuDNN libraries are
> missing), the backend automatically retries on the CPU using a safe `float32` compute type. Set
> `whisper.cpuFallbackModel` to specify a smaller checkpoint for that retry; the default `base` model keeps CPU fallbacks
> responsive. Use `null` to reuse the primary model when you accept the extra latency.

### 2. Control language and sample rate

- `language`: Set to an ISO 639-1 code such as `"en"`, `"es"`, or `"de"`. Leave blank or omit to let Whisper auto-detect.
- `sampleRate`: The PCM stream emitted by FFmpeg is resampled to this rate before it reaches Whisper. Keeping it at `16000` keeps CPU and bandwidth requirements low while still matching Whisper's training data. Increase to `22050` or `44100` only if your source truly carries detail above 8 kHz that you need to preserve.

### 3. Balance latency with chunk sizing

Whisper works on buffered audio chunks. Shorter buffers return text faster; longer buffers improve context for punctuation and speaker cadence.

| Scenario                | `chunkLength` (seconds) | Notes |
|-------------------------|-------------------------|-------|
| Ultra low latency       | `15`                    | Minimal delay; may split sentences mid-way |
| Low-latency dispatch (default) | `20`           | Ships with the repo to prioritise quick updates |
| Balanced                | `30` – `60`             | Good compromise for most streams |
| Long-form accuracy      | `90` – `120`            | Helpful for lectures or narrations where latency is acceptable |

`minChunkDurationSeconds` ensures Whisper has at least that much speech before a transcription is emitted. Keep it a few seconds lower than `chunkLength` so pauses can still flush text (e.g. the defaults use `chunkLength: 20`, `minChunkDurationSeconds: 12`).

> ℹ️ **Silence-only chunks:** When no one is speaking, the backend waits for roughly
> `minChunkDurationSeconds + silenceHoldSeconds` before sending a "blank" update to
> the UI. Lowering either value shortens those silent updates; raising them keeps
> the log quieter.

`contextSeconds` determines how much previously transcribed audio is appended to the start of the next chunk. Think of it as an overlap between chunks: `0` repeats nothing, higher values replay a short tail to keep sentences flowing. Values between `2` and `6` seconds work well in practice—go higher if speakers pause mid-sentence or if punctuation keeps drifting. The defaults lean toward quick dispatch updates with `0.5` seconds of context; you can raise it if punctuation accuracy matters more than latency.

### 4. Filter obvious repetition loops

Whisper occasionally hallucinates by repeating the same long phrase over and over. When that happens the audio usually still contains energy, so silence heuristics do not catch the burst. Use the repetition guardrails to turn those loops into `[unable to transcribe]` entries instead of flooding the log with nonsense text.

```yaml
whisper:
  segmentRepetitionMinCharacters: 16
  segmentRepetitionMaxAllowedConsecutiveRepeats: 4
```

- `segmentRepetitionMinCharacters` controls the shortest phrase (in characters) that the repetition detector considers. Phrases shorter than the threshold are ignored so common fillers such as "yeah" or "uh" do not trigger the filter.
- `segmentRepetitionMaxAllowedConsecutiveRepeats` limits how many times that phrase may appear consecutively inside a segment before the backend flags the burst as untranscribable. Set it to `0` to disable the check entirely when you prefer Whisper's raw output.

### 5. Fine-tune silence detection

These parameters decide when a chunk should finish:

- `silenceThreshold`: Float between `0` and `1` describing the RMS energy considered “silence”.
  - `0.010` – quiet studios.
  - `0.020` – shipping default tuned for dispatch audio.
  - `0.030` – noisy radio feeds.
- `silenceLookbackSeconds`: Window of recent audio to inspect for silence. Start with `2` – `4` seconds (`2` is the default).
- `activeSamplesInLookbackPct`: Percentage of samples in the lookback window that must be active (above threshold) to continue recording. Typical values: `0.10` (shipping default, reacts quickly) to `0.25` (wait for sustained speech).
- `silenceHoldSeconds`: Delay added after silence is detected before finalising the chunk. Lower (`1`–`1.5`, default `1.2`) for speed; higher (`2.5`–`3`) to avoid clipping trailing words.

If background noise triggers false starts, raise `silenceThreshold` or `silenceHoldSeconds`. If transcripts lag behind, lower those values slightly.

### 6. Handle brief noise bursts

- `noSpeechThreshold`: Minimum seconds of audio required before Whisper decides the speaker is active. `2.0` helps ignore coughs or clicks; `3.0` is better for environments with intermittent noise. This value also acts as the baseline length for blank-audio placeholders when Whisper cannot produce text.
- `blankAudioMinDurationSeconds`: Override the minimum audio length required before emitting a blank-audio entry. Defaults to the larger of `0.75` seconds or `minChunkDurationSeconds`.
- `blankAudioMinActiveRatio`: Require this proportion of samples to sit above the silence threshold before we surface a blank-audio placeholder. Increase it to suppress hiss-heavy feeds.
- `blankAudioMinRms`: Minimum RMS energy needed for a blank-audio entry. Raise it if background static should stay hidden; lower it when quiet radios still need to appear.

 Automatic reconnection on prolonged silence

- `silentStreamReconnectSeconds`: When an HTTP audio source remains effectively silent for this many seconds, the backend restarts the upstream connection. This nudges stuck transports that keep delivering zero-energy audio. Set to `0` or `null` to disable. Default: `3600` (one hour).
 - `upstreamNoDataReconnectSeconds`: When no PCM bytes are received from the upstream process for this many seconds (a transport stall), the backend restarts the upstream connection. This is independent of audio energy and safe to keep enabled. Set to `0` or `null` to disable. Default: `120` seconds.

When Whisper returns no text but these thresholds are met, the UI shows a "Silence" chip with playback controls so operators can review the captured audio manually. Short or low-energy bursts are filtered out.

### 7. Manage concurrent transcription jobs

- `maxConcurrentProcesses`: Caps how many Whisper invocations can run at once while streams themselves continue recording. The
  value now sizes the dedicated transcription executor: it spawns that many long-lived worker threads and a queue four times as
  deep, so excess chunks wait for an open slot rather than blocking the event loop. The default (`2`) balances CPU load against
  latency on typical four-core systems. Set this to `1` on very small devices and raise it when you have more CPU threads
  available; values below `1` are treated as `1` to keep transcription moving.

### 8. Optimise decoder heuristics

Beam search combined with lower decoding temperatures helps Whisper stay on
message when similar calls repeat all day. The following options bias the model
toward consistent phrasing without forcing every token:

- `beamSize`: Number of beams searched per chunk. Dispatch audio benefits from
  `6`–`8` beams (default `8`) so rare call signs such as “Noarlunga” and status
  codes like “SITREP” stay in the candidate set.
- `decodeTemperature`: Primary sampling temperature. Keep it near `0` for
  deterministic beams and raise slightly (`0.2`) if you notice incomplete words
  after model upgrades.
- `temperatureIncrementOnFallback`: Increment applied when Whisper exhausts the
  current beam but still needs text. The default `0.2` lets the decoder relax in
  difficult noise without immediately jumping to high temperatures.
- `conditionOnPreviousText`: Set to `false` (default) when each chunk should be
  judged independently. Enabling it can help long-form narration but risks
  cementing earlier mistakes in dispatch contexts.
- `initialPrompt`: Optional priming string injected at the start of each job.
  Use it to list frequently misheard locations or agency-specific jargon.
- `prompts`: Optional mapping of named prompts you can reference from streams.
  When a stream sets `initialPromptName`, that named prompt is used for that
  stream; otherwise the global `initialPrompt` (if any) applies.

Example:

```yaml
whisper:
  # Global fallback (used if a stream does not specify a named prompt)
  initialPrompt: >-
    This is an emergency radio conversation.
  prompts:
    sa_ses: >-
      This is part of an emergency radio conversation between firefighters and
      other emergency services in South Australia. Priority callouts include
      Adelaide, Adelaide fire out, Noarlunga, SITREP, SAPOL, and SES.

streams:
  - id: broadcastify-2653
    name: SA SES Radio
    url: https://broadcastify.cdnstream1.com/2653
    enabled: true
    initialPromptName: sa_ses
```

### 9. Condition radio audio up front

Live radio links carry hiss, pre-emphasis curves, and bass rumble that mask key
syllables. The backend now exposes a lightweight conditioning chain tuned for
scanner feeds:

- `highpassCutoffHz`: Single-pole high-pass filter that strips sub-bass and DC
  offset. Values between `200` and `300` Hz keep voice fundamentals while
  removing engine rumble. Set to `0` to disable.
- `lowpassCutoffHz`: Complementary low-pass filter that discards ultra-high
  noise. Frequencies between `3200` and `4000` Hz preserve consonant detail for
  Whisper while cutting broadband hiss.
- `deemphasisTimeConstantMicros`: Applies FM radio de-emphasis. Leave it at the
  regional standard (`75` µs for Australia/US, `50` µs for many European feeds)
  or disable with `0` when the source audio is already flat.
- `agcTargetRms`: Overrides the automatic gain target. When unset, the backend
  derives a safe value from `silenceThreshold`. Specify a float such as `0.04`
  to push quiet agencies a little louder or drop to `0.02` if clipping occurs.

Set any of these fields to `null` (or `0` for the frequency cut-offs) to bypass
the corresponding stage.

### 10. Filter hallucinated silence

Whisper occasionally emits stock phrases or punctuation during silent stretches. The backend now reads
`whisper.silenceHallucinationPhrases` from your configuration files so you can maintain the block without
touching the source. Provide any phrases you consider noise and the transcriber discards matching chunks
when the surrounding audio is effectively silent.

```yaml
whisper:
  silenceHallucinationPhrases:
    - "thank you"
    - "transcription by castingwords"
    - "casting words"
    - "all right here we go"
    - "standing by"
```

Transcriptions that contain only punctuation (such as a single period) are also treated as hallucinations
and filtered automatically, so you do not need to list them explicitly. Phrase matching ignores casing and
strips punctuation from both your configuration and Whisper's output, so entries such as `"Thank you."`
still match a configured `"thank you"` rule. The backend also treats strings made up of repeated instances
of a configured phrase (for example, `"thank you thank you"`) as hallucinations so common duplications are
filtered automatically.

### 11. Restart silent streams automatically

Long-running Broadcastify and Icecast feeds occasionally stall without closing
the TCP connection. When that happens the stream continues to deliver perfect
silence and the usual connection watchdogs never fire. Set
`whisper.noAudioReconnectSeconds` to have WaveCap reconnect those feeds after a
prolonged quiet spell.

The timer counts how long the worker has gone without seeing samples above the
configured silence threshold. Once the limit is exceeded the backend logs a
system event ("Lost connection to upstream stream; no audio detected for …")
and restarts FFmpeg. Use a large window—an hour (`3600`) is a safe starting
point for dispatch feeds that naturally have short pauses. Set the field to
`null` to disable the watchdog entirely.

```yaml
whisper:
  # Restart the stream when silence persists for an hour.
  noAudioReconnectSeconds: 3600
```

### 12. Example configurations

**Low-latency dispatch console** (`state/config.yaml`):

```yaml
whisper:
  model: tiny.en
  chunkLength: 20
  minChunkDurationSeconds: 12
  contextSeconds: 0.5
  silenceThreshold: 0.02
  silenceLookbackSeconds: 2
  activeSamplesInLookbackPct: 0.08
  silenceHoldSeconds: 1.2
  noSpeechThreshold: 2.0
```

**High-accuracy archival recording**:

```yaml
whisper:
  model: medium
  cpuFallbackModel: base
  chunkLength: 90
  minChunkDurationSeconds: 70
  contextSeconds: 2
  silenceThreshold: 0.012
  silenceLookbackSeconds: 4
  activeSamplesInLookbackPct: 0.2
  silenceHoldSeconds: 2.5
  noSpeechThreshold: 3.5
  language: en
  sampleRate: 44100
```

Feel free to mix and match these values. After editing `state/config.yaml`, restart the backend (or run `npm run dev` again) so the new settings take effect.

## Development helpers

When you only need the UI for demonstrations or screenshots, set the `WAVECAP_USE_PASSTHROUGH_TRANSCRIBER` environment variable to `1`. The backend then swaps Whisper for a lightweight passthrough stub so no model downloads are attempted. The `start-screenshot.sh` helper script in the repository root exports this flag automatically before launching `start-app.sh --screenshot-fixtures`.

## Troubleshooting

- **Configuration parse errors**: Check YAML indentation or JSON structure for trailing commas and mismatched braces. Remember that comments require the YAML format.
- **Transcripts cut off mid-sentence**: Increase `silenceHoldSeconds` or reduce `silenceThreshold`.
- **Transcripts lag behind**: Decrease `chunkLength`, `silenceHoldSeconds`, or `noSpeechThreshold`.
- **Background noise triggers text**: Raise `silenceThreshold` and `noSpeechThreshold`, or switch to a larger model for better discrimination.

For additional operational logging, enable the logging settings in the same config files and monitor the generated log files inside the `state` directory.
