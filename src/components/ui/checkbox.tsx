"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckedChange?.(e.target.checked);
      onChange?.(e);
    };

    return (
      <div className={`relative inline-flex items-center ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          checked={checked}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <div
          className={`
            h-4 w-4 shrink-0 rounded border border-[var(--border)] transition-colors
            peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--ring)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--background)]
            peer-disabled:cursor-not-allowed peer-disabled:opacity-50
            ${checked 
              ? "bg-[var(--primary)] border-[var(--primary)]" 
              : "bg-transparent hover:bg-[var(--secondary)]"
            }
          `}
          onClick={() => onCheckedChange?.(!checked)}
        >
          {checked && (
            <svg
              className="h-4 w-4 text-[var(--primary-foreground)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
