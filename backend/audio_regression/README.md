# Audio Regression Suite

This directory houses curated audio fixtures that exercise the end-to-end
transcription pipeline. Populate `cases.jsonl` with entries that describe the
expected transcript for each audio clip and place the referenced media inside
the `audio/` subdirectory.

Each JSON line should contain at least the following fields:

```json
{
  "name": "unique-case-name",
  "audio": "audio/example.wav",
  "expected_transcript": "The reference text for the clip"
}
```

Additional metadata such as `transcription_id`, `stream_id`, `timestamp`, or
`review_status` can also be recorded. Paths inside `audio` are stored relative to this folder so test suites remain portable.

Use `python -m wavecap_backend.tools.export_transcriptions --help` to learn how
verified transcriptions can be exported directly into this structure.
