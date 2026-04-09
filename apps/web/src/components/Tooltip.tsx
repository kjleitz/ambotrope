import { useState, useRef, useEffect, type ReactNode } from "react";

interface TooltipProps {
  text: string | undefined;
  children: ReactNode;
  position?: "top" | "bottom";
}

export function Tooltip({ text, children, position: preferredPosition }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [resolvedPosition, setResolvedPosition] = useState<"top" | "bottom">(preferredPosition ?? "top");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !wrapperRef.current || preferredPosition) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    // If not enough room above, show below
    setResolvedPosition(rect.top < 48 ? "bottom" : "top");
  }, [visible, preferredPosition]);

  useEffect(() => {
    if (preferredPosition) setResolvedPosition(preferredPosition);
  }, [preferredPosition]);

  if (!text) return <>{children}</>;

  return (
    <div
      ref={wrapperRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          ref={tooltipRef}
          className="absolute left-1/2 z-50 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none"
          style={{
            transform: "translateX(-50%)",
            ...(resolvedPosition === "top"
              ? { bottom: "calc(100% + 6px)" }
              : { top: "calc(100% + 6px)" }),
            background: "var(--color-text)",
            color: "var(--color-surface)",
            boxShadow: "var(--shadow-md)",
          }}
        >
          {text}
          {/* Arrow */}
          <div
            className="absolute left-1/2"
            style={{
              transform: "translateX(-50%)",
              ...(resolvedPosition === "top"
                ? {
                    top: "100%",
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid var(--color-text)",
                  }
                : {
                    bottom: "100%",
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderBottom: "5px solid var(--color-text)",
                  }),
            }}
          />
        </div>
      )}
    </div>
  );
}
