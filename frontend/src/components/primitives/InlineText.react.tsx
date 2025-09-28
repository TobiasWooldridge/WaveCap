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
    { as, gap, wrap = false, className, ...rest }: InlineTextProps<C>,
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
          className,
        )}
      />
    );
  },
) as InlineTextComponent;

InlineText.displayName = "InlineText";

export type { InlineTextProps };
export default InlineText;

