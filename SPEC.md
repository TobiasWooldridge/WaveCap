# Project Specification

WaveCap provides a browser-based control console for monitoring and
transcribing multiple radio or pager feeds in real time.

## Purpose and Audience
- Give volunteer radio operators a single tool to monitor multiple radio channels and pager feeds at once; providing replay functionality if they ever miss or need to go back to a message.
- Stay simple enough for scanner hobbyists to run at home without custom scripts.

## Product Snapshot
- Ships as one FastAPI service that serves the API and web app; install Python 3.10+, Node.js/npm, and ffmpeg, or use the provided Dockerfile/Compose setup. Optional SDR capture is available via SoapySDR (e.g., SDRplay RSPdx with the SoapySDRPlay3 plugin).
- Runs on one machine or small server; every browser session connects to the same state through HTTP and WebSocket endpoints.
- Keeps Whisper inference off the FastAPI event loop by routing transcription jobs through a shared thread-based executor, which is the stepping stone toward hosting workers in a separate service.
- Stores configuration in JSON so admins can preload stream URLs, names, language defaults, and UI preferences before sharing the app.

## Primary Workflows
### 1. Preparing Streams
- Open the app to see each stream with its name, URL, and status badge. Streams can be backed by HTTP audio, local SDR channels, or tokenised pager feeds.
- Add an audio stream with a URL, optional name, and optional language. The backend validates the entry, acknowledges it, and saves it for all users.
- Create a pager feed when no audio exists; the UI issues a webhook URL and token so CAD systems can post messages directly.
- Remove unused streams; the update syncs to every user and persists on disk.
- Rename streams to keep labels accurate; updates propagate instantly to every operator.
- Skip the first seconds of Broadcastify streams automatically (30 seconds by default, configurable per stream).
- Define combined stream views in configuration files to surface virtual conversations that merge transcripts from multiple audio or pager sources.
- Configure named transcription prompts and assign them per-stream. Define
  `whisper.prompts` once and reference with `initialPromptName` in each stream
  to tailor biasing by agency or region; streams without a name fall back to
  the global `whisper.initialPrompt` when provided.
- For SDR-backed streams, choose narrow/wide FM or AM demodulation, tighten complex channel bandwidth, apply per-stream squelch thresholds, and adjust hardware controls (gain mode, RF bandwidth, antenna, LO offset, PPM correction) directly through configuration files.
- Restart behavior is automatic when configured streams are enabled; status updates instantly for every connected browser. If a remote HTTP stream drops unexpectedly, the backend attempts to reconnect immediately once and then only every ten minutes to avoid hammering the source.
- Each stream exposes two state fields in the API: an **enabled** flag that comes exclusively from configuration (`state/config.yaml`) and a runtime **status** flag that reflects the backend's current progress (stopped, queued, transcribing, or error). The UI does not toggle enabled/disabled; it only reflects the configured streams.

### 2. Monitoring Live Traffic
- Use the stream list to spot transcribing, queued, stopped, or error states. Queued means the stream was enabled and is waiting for the backend to catch up. If Whisper concurrency is full, recording continues and transcripts arrive once a slot opens.
- Sort the stream sidebar by latest activity or stream name. Streams pinned in configuration files stay at the top regardless of the selected sort mode.
- Open each stream's conversation view with search, time-range filters, and "Go to timestamp" controls to review recent traffic.
- Read system log entries that mark recording and transcription start or stop events, as well as upstream connection interruptions and recoveries.
- See stream status and unread badges in the sidebar. Unread counts persist per browser session via localStorage so refreshes don’t reset them. Start/Stop controls are removed; enable/disable streams via `state/config.yaml`.
- Controls that trigger backend actions disable their buttons and show a spinner while the backend processes the request, preventing duplicate submissions.
- Panels that may take time to populate display loading spinners until data arrives so operators understand the UI is still working.
- Check aggregate counters for transcript volume, confidence, and recent activity.
- Receive real-time transcript bursts; contiguous speech is grouped for readability.
- Pager feed messages that share an incident number and arrive within roughly a minute
  collapse into a single grouped thread, showing parsed incident details like the call
  type, location, and alarm level alongside the individual updates.
  When pager messages include a partial address, the UI appends a base location
  (state and/or country) to Google Maps searches so links and embeds resolve
  within the expected region. A per-stream `baseLocation` takes precedence; the
  global `ui.baseLocation` is used as a fallback.
- Timestamps in transcript and pager views include a relative interval after the
  absolute time (e.g., “5 minutes ago”, “3 hours ago”, “yesterday”). The UI supports
  a condensed form where space is limited (e.g., “5m ago”). Future timestamps are
  shown symmetrically (e.g., “in 5 minutes”, “tomorrow”).
- When Whisper returns no text but audio passes silence thresholds, show a "Silence" entry with playback controls. If the clip contains noisy speech Whisper cannot decode, surface it as `[unable to transcribe]` and keep the recording for operators to replay.
- Segments that loop the same long phrase beyond configured repetition limits are treated as `[unable to transcribe]` entries so the log highlights bursts Whisper could not confidently decode.
- Suppress hallucinated phrases on barely audible bursts; if a chunk lacks meaningful energy the backend drops Whisper's text entirely so the transcript log stays empty instead of fabricating callouts.
- Load roughly the last three hours of transcripts per stream on initial view and fetch older history on demand (including auto-loading when needed) to keep the interface responsive. Loaded transcripts persist until refresh or reset; the toolbar no longer clears local history.
- When a browser tab stays hidden for about fifteen minutes, the UI releases its WebSocket connection and reconnects automatically (refreshing stream data) as soon as the operator returns to the tab.
- Get banners and chimes for configured keywords such as "Mayday" or "Pan-Pan."
- Edit watch keywords and toggle chimes from the overview modal; changes apply to all browsers and persist until restart unless saved in `state/config.yaml`.
- Open the inline audio player to monitor a stream live.

### 3. Reviewing Recent Audio
- Editors sign in with the shared password to enable editing and export tools; leave correction mode off for passive listening.
- Browse transcript history with timestamps and confidence indicators.
- Click a transcript to play the related WAV clip or individual segments with highlighting.
- Playback trims leading silence automatically.
- Blank-audio placeholders still expose playback while filtering short, low-energy noise. Clips Whisper could not decode remain available with `[unable to transcribe]` text so humans can retry the audio.
- WAV clips load only when requested so browsing large transcript sets stays fast even with many recordings.
- Edit transcripts in place, record reviewer details, and mark correction or verification status.
- Reset a stream to clear transcripts and audio.

### 4. Coordinating With a Team
- Multiple operators work simultaneously; actions broadcast instantly so everyone sees the same data.
- Operators get toast errors for failed commands and green confirmations once the server accepts a request.

### 5. Automating or Integrating
- Scripts can call the same HTTP endpoints as the frontend to add, start, stop, or reset streams.
- Pager feeds expose token-protected webhook URLs (`POST /api/pager-feeds/{streamId}?token=...`) so CAD systems can push messages without audio.
- Append `format` to the webhook query (for example `format=cfs-flex`) to submit
  structured CAD payloads that the backend will normalise into readable
  transcripts before they appear in the UI.
- CFS Flex submissions extract incident numbers, call types, map grids,
  talkgroups, narratives, and responding units from the raw FLEX string.
  The original raw FLEX line is preserved and accessible under the
  collapsible "View raw message" panel for each incident.
- Pager streams condense fragments that arrive within a few seconds into a
  single structured summary. The UI presents these as a compact, scrollable
  table with columns for time, category + narrative, address (with a Maps link),
  alarm level, priority, talkgroup, units, and alerts. Each row expands to
  reveal details and the original fragments on demand.
- When pager incidents include an address or map grid, the pager list places a
  Google Maps icon at the start of the Address column. Clicking it opens a
  dialog with an embedded map and an optional "Open in Google Maps" link. When
  `ui.googleMapsApiKey` is configured, the dialog uses the richer Google Maps
  Embed API; otherwise it falls back to a basic public embed.
- Export reviewed transcripts as a ZIP with audio via header controls, choosing corrected, verified, or pending items.
- Export pager feeds as ZIP archives from the settings modal; downloads include JSONL pager messages and incident details.
- `python -m wavecap_backend.tools.export_transcriptions --output-dir <path>` builds a fine-tuning dataset with JSONL metadata, optional audio copies, and notebook guidance.
- Transcripts and stream definitions persist on disk in `state/runtime.sqlite` and `state/recordings/` for external archiving.

## Demo & Screenshot Fixtures
- Start the backend with curated demo data using `--screenshot-fixtures` (alias `--fixture-set screenshot`) on `python -m wavecap_backend`, `start-app.sh`, or `start-app.ps1`. The flag resets state and loads representative streams, transcripts, reviews, alerts, and audio placeholders for documentation captures.

## Operator Interface Map
- **Conversation Workspace**: Messenger-style layout with a sidebar that sorts streams by activity and shows unread indicators. When no streams exist, the pane reminds operators to define them in the configuration files.
- **Metrics Cards**: Show active stream counts, transcript totals, average confidence, and processed audio time.
- **Stream Sidebar**: Lists configured streams, highlights status at a glance, and surfaces Start/Stop controls inside each conversation header with Reset tucked behind a "More actions" overflow button. Operators can sort entries by latest activity or name, and streams marked as pinned in configuration files stay ahead of the selected order. Streams themselves are defined in YAML configuration files.
- **Combined Views**: Virtual sidebar entries configured in YAML that merge the activity of multiple streams into a single conversation. They show aggregated status indicators but omit transport controls so operators manage the underlying sources directly.
- **Transcript Panel**: Fills the conversation pane with grouped bursts, timestamps (in the viewer's timezone), confidence colours, and inline playback. Segments keep their width while playing so text does not shift. Conversations stay anchored to the latest entries, auto-scroll at the live edge, and reveal a "Go to latest" pill when the user scrolls up.
- **Global Controls**: Surface red error toasts and green confirmations after actions.
- **Transcript Correction Toggle**: Header checkbox (editors only) that hides or shows review badges, editing tools, and exports.
- **Reviewed Export Controls**: Header controls that select review states before downloading a ZIP with JSONL transcripts and audio clips.

## Frontend Component Roles
- **StreamDirectoryPanel**: Wraps the stream list, status badges, and controls for starting, stopping, or resetting streams.
- **TranscriptionMetricsPanel**: Summarises live activity with aggregate transcription counts, confidence, and duration.
- **StreamTranscriptionPanel**: Shows grouped transcript bursts, history and search tools, playback controls, and an optional live audio player.
- **TranscriptionSummaryCard**: Presents a single transcription with timestamps, durations, and confidence indicators.
- **TranscriptionSegmentChip**: Clickable Whisper segment that plays the matching audio slice.

- Install prerequisites (Python 3.10+, Node.js, npm, ffmpeg). The `start-app.sh` or `.ps1` helpers create a virtual environment, install dependencies, build the frontend, and start the FastAPI server; manual steps remain available.
- Tune defaults in `state/config.yaml`, including sample rate, Whisper model, allowed browser origins, and initial UI settings (theme, transcript tools, export defaults). Configuration is YAML-only.
- When `state/config.yaml` does not exist, the backend copies the shipped defaults wholesale, rotating pager webhook tokens and shared passwords so every deployment starts with hardened secrets.
- Define default keyword alerts in `state/config.yaml`. Operators can tweak rules during a session, but those tweaks persist only in memory until the backend restarts.
- Unauthenticated visitors browse in read-only mode. Use the header sign-in button and shared editor password to unlock transport controls (Start/Stop/Reset), transcript editing, and exports.
- Stopping the server keeps saved streams and transcripts. Restarting reloads them; operators can still clear history via stream reset.
- Recording flags persist across restarts; streams that were recording resume automatically.
- Whisper model downloads are cached. The default uses `large-v3-turbo` on GPU and falls back to `base` on CPU. Expect a large first download and plan for capable hardware.
- When multiple streams run, all continue recording; only Whisper jobs throttle when concurrency is maxed. Adjust `whisper.maxConcurrentProcesses` to match available cores.

## Limitations
- Keyword alert edits made in the UI reset on backend restart; edit `state/config.yaml` for permanent changes.
- Resetting a stream deletes its recordings because files are stored by timestamp only.
- The frontend expects the backend on the same origin. When running the Vite dev server separately, update `frontend/vite.config.ts` if the backend is not at `http://localhost:8000`.
- Confidence scores rely on Whisper heuristics and should be treated as guidance, not guarantees.

## Future Features
- Configurable retention rules (keep the last N hours or N transcripts) instead of manual resets.
- UI controls for server connection settings, stream ordering, and default languages.
- Alert rules for specified words or low-confidence results, delivered as sounds or browser notifications.
- Decouple the transcription workers from the UI/API service so each can scale independently for heavier ingest loads and large numbers of simultaneous viewers; the dedicated executor makes this a drop-in swap for a remote service.
