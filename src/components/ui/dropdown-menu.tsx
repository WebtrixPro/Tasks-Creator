"use client";

import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

interface DropdownMenuProps {
  children: ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}

export function DropdownMenuTrigger({ children, asChild, className = "" }: DropdownMenuTriggerProps) {
  const context = useContext(DropdownContext);
  if (!context) throw new Error("DropdownMenuTrigger must be used within DropdownMenu");

  return (
    <div
      onClick={() => context.setOpen(!context.open)}
      className={`cursor-pointer ${className}`}
    >
      {children}
    </div>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}

export function DropdownMenuContent({ children, className = "", align = "end" }: DropdownMenuContentProps) {
  const context = useContext(DropdownContext);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        context?.setOpen(false);
      }
    };

    if (context?.open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [context]);

  if (!context?.open) return null;

  const alignClass = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }[align];

  return (
    <div
      ref={ref}
      className={`
        absolute z-50 mt-2 min-w-[8rem] rounded-lg border border-[var(--border)] bg-[var(--card)] p-1 shadow-lg
        animate-in fade-in-0 zoom-in-95
        ${alignClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  destructive?: boolean;
}

export function DropdownMenuItem({
  children,
  onClick,
  className = "",
  disabled = false,
  destructive = false,
}: DropdownMenuItemProps) {
  const context = useContext(DropdownContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    context?.setOpen(false);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-sm outline-none
        transition-colors
        ${disabled ? "pointer-events-none opacity-50" : ""}
        ${destructive 
          ? "text-[var(--destructive)] hover:bg-[var(--destructive)]/10" 
          : "hover:bg-[var(--secondary)]"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator({ className = "" }: { className?: string }) {
  return <div className={`-mx-1 my-1 h-px bg-[var(--border)] ${className}`} />;
}

export function DropdownMenuLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-2 py-1.5 text-sm font-semibold ${className}`}>{children}</div>;
}
