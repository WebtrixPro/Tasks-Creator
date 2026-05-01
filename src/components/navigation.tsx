"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { CheckSquareIcon } from "@/components/ui/icons";

type NavItem = {
  label: string;
  href: string;
  description?: string;
};

const navItems: NavItem[] = [
  { label: "Import", href: "/", description: "Import & sync tasks" },
  { label: "Tasks", href: "/tasks", description: "Manage tasks" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)]">
            <CheckSquareIcon className="h-5 w-5 text-[var(--primary-foreground)]" />
          </div>
          <span className="hidden font-semibold text-[var(--foreground)] sm:inline-block">
            Tasks Creator
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  relative px-3 py-2 text-sm font-medium transition-colors
                  ${isActive 
                    ? "text-[var(--foreground)]" 
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }
                `}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
