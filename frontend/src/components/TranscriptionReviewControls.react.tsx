import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Save } from "lucide-react";
import type { TranscriptionResult, TranscriptionReviewStatus } from "@types";
import { Timestamp } from "./primitives/Timestamp.react";
import Button from "./primitives/Button.react";

interface TranscriptionReviewControlsProps {
  transcription: TranscriptionResult;
  onReview: (
    transcriptionId: string,
    updates: {
      correctedText?: string | null;
      reviewStatus: TranscriptionReviewStatus;
      reviewer?: string | null;
    },
  ) => Promise<unknown>;
  readOnly?: boolean;
}

const statusLabels: Record<TranscriptionReviewStatus, string> = {
  pending: "Pending review",
  corrected: "Correction saved",
  verified: "Verified for training",
};

const statusIcon = (status: TranscriptionReviewStatus) => {
  switch (status) {
    case "corrected":
      return <Save size={14} />;
    case "verified":
      return <CheckCircle2 size={14} />;
    default:
      return <RotateCcw size={14} />;
  }
};

export const TranscriptionReviewControls = ({
  transcription,
  onReview,
  readOnly = false,
}: TranscriptionReviewControlsProps) => {
  const [editingText, setEditingText] = useState<string>(
    () => transcription.correctedText ?? transcription.text,
  );
  const [reviewer, setReviewer] = useState<string>(
    () => transcription.reviewedBy ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadOnly = Boolean(readOnly);

  useEffect(() => {
    setEditingText(transcription.correctedText ?? transcription.text);
    setReviewer(transcription.reviewedBy ?? "");
    setError(null);
  }, [
    transcription.correctedText,
    transcription.id,
    transcription.reviewedBy,
    transcription.text,
  ]);

  const reviewStatus: TranscriptionReviewStatus =
    transcription.reviewStatus ?? "pending";
  const originalText = useMemo(
    () => transcription.text ?? "",
    [transcription.text],
  );
  const trimmedOriginal = originalText.trim();
  const trimmedDraft = editingText.trim();

  const finalReviewedText = useMemo(() => {
    if (
      typeof transcription.correctedText === "string" &&
      transcription.correctedText.trim().length > 0
    ) {
      return transcription.correctedText.trim();
    }
    return transcription.text;
  }, [transcription.correctedText, transcription.text]);

  const hasDraftChange = trimmedDraft !== trimmedOriginal;
  const reviewerValue = reviewer.trim();
  const lastReviewedAtNode = transcription.reviewedAt ? (
    <Timestamp
      value={transcription.reviewedAt}
      mode="datetime"
    />
  ) : null;

  const handleSubmit = async (status: TranscriptionReviewStatus) => {
    if (isReadOnly) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onReview(transcription.id, {
        reviewStatus: status,
        correctedText: status === "pending" ? null : editingText,
        reviewer: status === "pending" ? null : reviewerValue || null,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update transcription",
      );
    } finally {
      setSaving(false);
    }
  };

  const disableCorrectionSave =
    trimmedDraft.length === 0 || saving || isReadOnly;
  const disableVerify = saving || isReadOnly;
  const disableReset = saving || reviewStatus === "pending" || isReadOnly;

  return (
    <div className="review-editor">
      <div className="review-editor__header">
        <span className={`review-badge review-badge--${reviewStatus}`}>
          {statusIcon(reviewStatus)}
          {statusLabels[reviewStatus]}
        </span>
        <div className="review-editor__meta">
          {lastReviewedAtNode ? (
            <span>
              Last updated {lastReviewedAtNode}
              {transcription.reviewedBy
                ? ` by ${transcription.reviewedBy}`
                : ""}
            </span>
          ) : (
            <span>No review recorded yet</span>
          )}
        </div>
      </div>

      <div className="review-editor__body">
        <div className="review-editor__original">
          <span className="review-editor__label">Original transcript</span>
          <p
            className="review-editor__text"
            data-variant={hasDraftChange ? "muted" : "default"}
          >
            {originalText || "—"}
          </p>
        </div>
        {isReadOnly ? (
          <div className="review-editor__note">
            <span className="review-editor__label">Reviewer</span>
            <p className="review-editor__text">
              {transcription.reviewedBy?.trim() || "—"}
            </p>
          </div>
        ) : (
          <>
            <div>
              <label
                className="review-editor__label"
                htmlFor={`review-draft-${transcription.id}`}
              >
                Correction draft
              </label>
              <textarea
                id={`review-draft-${transcription.id}`}
                className="form-control review-editor__textarea"
                value={editingText}
                onChange={(event) => setEditingText(event.target.value)}
                rows={Math.max(
                  2,
                  Math.min(6, Math.ceil(editingText.length / 80)),
                )}
                disabled={saving}
              />
            </div>
            <div className="review-editor__note">
              <label
                className="review-editor__label"
                htmlFor={`reviewer-${transcription.id}`}
              >
                Reviewer (optional)
              </label>
              <input
                id={`reviewer-${transcription.id}`}
                type="text"
                className="form-control form-control-sm"
                value={reviewer}
                onChange={(event) => setReviewer(event.target.value)}
                placeholder="Your name or callsign"
                disabled={saving}
              />
            </div>
          </>
        )}
      </div>

      {isReadOnly ? (
        <div className="review-editor__notice text-body-secondary small">
          Sign in to update review status or corrections.
        </div>
      ) : (
        <>
          <div className="review-editor__actions">
            <div className="review-editor__actions-left">
              <Button
                type="button"
                size="sm"
                use="primary"
                onClick={() => void handleSubmit("corrected")}
                disabled={disableCorrectionSave}
                startContent={<Save size={14} />}
              >
                Save correction
              </Button>
              <Button
                type="button"
                size="sm"
                use="success"
                onClick={() => void handleSubmit("verified")}
                disabled={disableVerify}
                startContent={<CheckCircle2 size={14} />}
              >
                Mark verified
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              use="secondary"
              onClick={() => void handleSubmit("pending")}
              disabled={disableReset}
              startContent={<RotateCcw size={14} />}
            >
              Clear review
            </Button>
          </div>

          {error ? <div className="review-editor__error">{error}</div> : null}
        </>
      )}

      <div className="review-editor__footer">
        <span className="review-editor__footer-label">Reviewed transcript</span>
        <p className="review-editor__footer-text">{finalReviewedText || "—"}</p>
      </div>
    </div>
  );
};
