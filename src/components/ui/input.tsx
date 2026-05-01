import { type InputHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={`
          flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm
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

Input.displayName = "Input";
