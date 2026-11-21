import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-black text-white shadow-md hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:shadow-none",
  secondary: "border border-neutral-300 bg-white/70 text-black backdrop-blur hover:border-black disabled:text-neutral-400",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`press inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${className}`}
      {...props}
    />
  );
}

/** Stagger index for the `animate-enter` utility. */
export const enterDelay = (index: number) => ({ "--enter-index": index }) as CSSProperties;

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="animate-enter mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-light tracking-tight md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}

/** Pill-shaped switch between a few options, like English / Arabic. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly { id: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="flex rounded-full bg-black/5 p-1" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={`press flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium ${value === option.id ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-black"}`}
        >
          {option.icon && <option.icon className="size-3.5" />} {option.label}
        </button>
      ))}
    </div>
  );
}

export function initialsOf(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

export function Section({ title, children, index = 0, action }: { title: string; children: ReactNode; index?: number; action?: ReactNode }) {
  return (
    <section className="animate-enter lift panel p-6" style={enterDelay(index)}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Draft / Published / Changed (live with unpublished edits), always in words. */
export function StatusPill({ status }: { status: string }) {
  const label = status === "changed" ? "Live, with unpublished changes" : status === "published" ? "Published" : status === "draft" ? "Draft" : status;
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${status === "published" ? "bg-black text-white" : "bg-black/5 text-neutral-700"}`}>{label}</span>;
}

/** A read that failed: the backend's own message. */
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="animate-enter panel py-16 text-center">
      <p className="font-medium">Couldn&apos;t load this</p>
      <p className="mt-1 text-sm text-neutral-500">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-12 w-64 animate-pulse rounded-full bg-neutral-300/50" />
      <div className="h-64 animate-pulse rounded-[1.75rem] bg-white/50" />
    </div>
  );
}
