import clsx from "clsx";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export type BadgeTone = "accent" | "neutral";

export type BadgeProps = {
  /**
   * Numeric value displayed within the badge. When omitted, the children are rendered as-is.
   */
  value?: number;
  /**
   * Upper bound for the numeric display. When the value exceeds this number, the badge shows
   * the maximum followed by a plus sign (for example, "99+"). Defaults to no upper bound.
   */
  max?: number;
  /**
   * Defines the color treatment for the badge. Defaults to the accent tone used for unread counts.
   */
  tone?: BadgeTone;
} & HTMLAttributes<HTMLSpanElement>;

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { value, max = Number.POSITIVE_INFINITY, tone = "accent", className, children, ...rest },
    ref,
  ) => {
    let content: ReactNode = children;

    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        const normalizedValue = Math.max(0, Math.trunc(value));
        if (Number.isFinite(max)) {
          const normalizedMax = Math.max(0, Math.trunc(max));
          content =
            normalizedValue > normalizedMax
              ? `${normalizedMax}+`
              : normalizedValue.toString();
        } else {
          content = normalizedValue.toString();
        }
      } else {
        content = children ?? value.toString();
      }
    }

    return (
      <span
        {...rest}
        ref={ref}
        className={clsx("app-badge", `app-badge--${tone}`, className)}
      >
        {content}
      </span>
    );
  },
);

Badge.displayName = "Badge";

export default Badge;
