"use client";

import { createContext, useContext, type ReactNode } from "react";

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | null>(null);

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export function AlertDialog({ open = false, onOpenChange, children }: AlertDialogProps) {
  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange: onOpenChange || (() => {}) }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const context = useContext(AlertDialogContext);
  return (
    <div onClick={() => context?.onOpenChange(true)} className="cursor-pointer">
      {children}
    </div>
  );
}

export function AlertDialogContent({ children, className = "" }: { children: ReactNode; className?: string }) {
  const context = useContext(AlertDialogContext);
  
  if (!context?.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => context.onOpenChange(false)}
      />
      <div
        className={`
          relative z-10 mx-4 w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl
          animate-in fade-in zoom-in-95
          ${className}
        `}
      >
        {children}
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col space-y-2 p-6 ${className}`}>{children}</div>;
}

export function AlertDialogTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}

export function AlertDialogDescription({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-[var(--muted-foreground)] ${className}`}>{children}</p>;
}

export function AlertDialogFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-end gap-3 border-t border-[var(--border)] bg-[var(--secondary)]/30 px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export function AlertDialogCancel({ children, className = "" }: { children: ReactNode; className?: string }) {
  const context = useContext(AlertDialogContext);
  return (
    <button
      type="button"
      onClick={() => context?.onOpenChange(false)}
      className={`
        inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 py-2 text-sm font-medium
        transition-colors hover:bg-[var(--secondary)]
        ${className}
      `}
    >
      {children}
    </button>
  );
}

interface AlertDialogActionProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  destructive?: boolean;
}

export function AlertDialogAction({ children, className = "", onClick, destructive = false }: AlertDialogActionProps) {
  const context = useContext(AlertDialogContext);
  
  const handleClick = () => {
    onClick?.();
    context?.onOpenChange(false);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium
        transition-colors
        ${destructive 
          ? "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90" 
          : "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}
