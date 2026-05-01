interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Separator({ orientation = "horizontal", className = "" }: SeparatorProps) {
  return (
    <div
      role="separator"
      className={`
        shrink-0 bg-[var(--border)]
        ${orientation === "horizontal" ? "h-px w-full" : "h-full w-px"}
        ${className}
      `}
    />
  );
}
