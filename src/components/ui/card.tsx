import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--card)] ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`px-6 py-5 border-b border-[var(--border)] ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = "" }: CardProps) {
  return <h2 className={`text-lg font-semibold tracking-tight ${className}`}>{children}</h2>;
}

export function CardDescription({ children, className = "" }: CardProps) {
  return <p className={`mt-1.5 text-sm text-[var(--muted-foreground)] ${className}`}>{children}</p>;
}
