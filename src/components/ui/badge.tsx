import { type ReactNode } from "react";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "outline";

type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  success: "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/20",
  warning: "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/20",
  danger: "bg-[var(--destructive)]/15 text-[var(--destructive)] border border-[var(--destructive)]/20",
  outline: "border border-[var(--border)] text-[var(--muted-foreground)]",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
