import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
} from "react";
import clsx from "clsx";

type PolymorphicRef<C extends ElementType> = ComponentPropsWithRef<C>["ref"];

type InlineTextGap = 0 | 1 | 2 | 3 | 4 | 5;

type InlineTextOwnProps<C extends ElementType> = {
  as?: C;
  /** Space between inline items, using the standard `gap-{n}` scale. */
  gap?: InlineTextGap;
  /** Allow wrapping when the line overflows. */
  wrap?: boolean;
  /** Optional start margin utility (Bootstrap `ms-{n}` or `ms-auto`). */
  marginStart?: InlineTextGap | "auto";
  /**
   * Deprecated: use `marginStart` instead. Kept for migration convenience.
   */
  ms?: InlineTextGap | "auto";
  className?: string;
};

type InlineTextProps<C extends ElementType> = InlineTextOwnProps<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof InlineTextOwnProps<C> | "as">;

type InlineTextComponent = (<C extends ElementType = "span">(
  props: InlineTextProps<C> & { ref?: PolymorphicRef<C> },
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => ReactElement | null) & { displayName?: string };

const InlineText = forwardRef(
  <C extends ElementType = "span">(
    { as, gap, wrap = false, marginStart, ms, className, ...rest }: InlineTextProps<C>,
    forwardedRef: ForwardedRef<unknown>,
  ) => {
    const ref = forwardedRef as PolymorphicRef<C>;
    const Component = (as ?? "span") as ElementType;

    return (
      <Component
        {...rest}
        ref={ref}
        className={clsx(
          "d-inline-flex align-items-baseline",
          wrap && "flex-wrap",
          typeof gap === "number" ? `gap-${gap}` : null,
          // Prefer explicit marginStart; fall back to legacy `ms` prop
          marginStart === "auto"
            ? "ms-auto"
            : typeof marginStart === "number"
              ? `ms-${marginStart}`
              : ms === "auto"
                ? "ms-auto"
                : typeof ms === "number"
                  ? `ms-${ms}`
                  : null,
          className,
        )}
      />
    );
  },
) as InlineTextComponent;

InlineText.displayName = "InlineText";

export type { InlineTextProps };
export default InlineText;
