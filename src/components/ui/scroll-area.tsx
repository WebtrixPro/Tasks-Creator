"use client";

import { type ReactNode } from "react";

interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
}

export function ScrollArea({ children, className = "" }: ScrollAreaProps) {
  return (
    <div
      className={`
        relative overflow-auto
        scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--border)]
        hover:scrollbar-thumb-[var(--muted-foreground)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
