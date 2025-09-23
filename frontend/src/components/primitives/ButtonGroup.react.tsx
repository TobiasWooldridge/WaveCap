import {
  cloneElement,
  forwardRef,
  isValidElement,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";

import Button from "./Button.react";
import type { ButtonSize } from "./Button.react";

type OverflowPlacement = "start" | "end";

export type ButtonGroupProps = {
  size?: ButtonSize;
  isVertical?: boolean;
  overflowButtons?: ReactNode | ReactNode[];
  overflowPlacement?: OverflowPlacement;
  overflowLabel?: string;
} & HTMLAttributes<HTMLDivElement>;

const ButtonGroup = forwardRef<HTMLDivElement, ButtonGroupProps>(
  (
    {
      size = "md",
      isVertical = false,
      className,
      role = "group",
      overflowButtons,
      overflowPlacement = "end",
      overflowLabel = "More actions",
      children,
      ...rest
    },
    ref,
  ) => {
    const [isOverflowOpen, setIsOverflowOpen] = useState(false);
    const groupRef = useRef<HTMLDivElement | null>(null);
    const overflowRef = useRef<HTMLDivElement | null>(null);

    const assignRefs = useCallback(
      (node: HTMLDivElement | null) => {
        groupRef.current = node;

        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          (ref as MutableRefObject<HTMLDivElement | null>).current = node;
        }
      },
      [ref],
    );

    const overflowItems = useMemo(() => {
      if (Array.isArray(overflowButtons)) {
        return overflowButtons.flatMap((item) =>
          item === null || item === undefined ? [] : [item],
        );
      }

      return overflowButtons == null ? [] : [overflowButtons];
    }, [overflowButtons]);

    const hasOverflow = overflowItems.length > 0;

    useEffect(() => {
      if (!isOverflowOpen) {
        return;
      }

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node | null;
        if (!target) {
          return;
        }

        if (overflowRef.current?.contains(target)) {
          return;
        }

        setIsOverflowOpen(false);
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsOverflowOpen(false);
        }
      };

      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isOverflowOpen]);

    useEffect(() => {
      if (!hasOverflow) {
        setIsOverflowOpen(false);
      }
    }, [hasOverflow]);

    const enhancedOverflowItems = useMemo(
      () =>
        overflowItems.map((item, index) => {
          if (!isValidElement(item)) {
            return item;
          }

          const existingOnClick = item.props?.onClick;

          const handleClick = (event: unknown) => {
            if (typeof existingOnClick === "function") {
              existingOnClick(event);
            }

            if (
              !(event instanceof Event && event.defaultPrevented) &&
              !(event && typeof event === "object" && "defaultPrevented" in event &&
                (event as { defaultPrevented?: boolean }).defaultPrevented)
            ) {
              setIsOverflowOpen(false);
            }
          };

          return cloneElement(item, {
            key: item.key ?? `overflow-${index}`,
            onClick: handleClick,
          });
        }),
      [overflowItems],
    );

    const overflowMenu = hasOverflow ? (
      <div className="btn-group__overflow" ref={overflowRef}>
        <Button
          size={size}
          use="secondary"
          appearance="outline"
          isCondensed
          tooltip={overflowLabel}
          aria-haspopup="menu"
          aria-expanded={isOverflowOpen}
          onClick={() => setIsOverflowOpen((open) => !open)}
          startContent={<MoreHorizontal size={16} />}
        >
          {overflowLabel}
        </Button>
        {isOverflowOpen ? (
          <div
            role="menu"
            className={clsx(
              "btn-group__overflow-menu",
              overflowPlacement === "start"
                ? "btn-group__overflow-menu--align-start"
                : "btn-group__overflow-menu--align-end",
            )}
          >
            {enhancedOverflowItems}
          </div>
        ) : null}
      </div>
    ) : null;

    return (
      <div
        {...rest}
        ref={assignRefs}
        role={role}
        className={clsx(
          isVertical ? "btn-group-vertical" : "btn-group",
          size !== "md" ? `btn-group-${size}` : undefined,
          className,
        )}
      >
        {hasOverflow && overflowPlacement === "start" ? overflowMenu : null}
        {children}
        {hasOverflow && overflowPlacement === "end" ? overflowMenu : null}
      </div>
    );
  },
);

ButtonGroup.displayName = "ButtonGroup";

export default ButtonGroup;
