import { type TextareaHTMLAttributes, forwardRef } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: boolean;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`
          flex min-h-[80px] w-full rounded-lg border bg-transparent px-3 py-2 text-sm
          transition-colors placeholder:text-[var(--muted-foreground)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]
          disabled:cursor-not-allowed disabled:opacity-50
          ${error 
            ? "border-[var(--destructive)] focus-visible:ring-[var(--destructive)]" 
            : "border-[var(--border)] focus-visible:border-[var(--primary)]"
          }
          ${className}
        `}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";
