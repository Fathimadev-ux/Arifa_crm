import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Button } from "@/components/ui";

/** Glass pill fields, the same as the rest of the CRM. */
const FIELD_BASE = "glass w-full px-4 text-sm shadow-sm outline-none transition-all placeholder:text-neutral-400 hover:bg-white/80 focus:bg-white focus:shadow-md";
export const INPUT = `${FIELD_BASE} h-10 rounded-full`;
export const TEXTAREA = `${FIELD_BASE} resize-y rounded-3xl py-2.5`;

export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="mb-1.5 block px-1 text-xs text-neutral-500">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ label, className, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} className={className}>
      <input className={INPUT} {...props} />
    </Field>
  );
}

/** Keys a date box still takes: move on, close the calendar, or clear the date. */
const DATE_KEYS = new Set(["Tab", "Escape", "Backspace", "Delete"]);

function openCalendar(input: HTMLInputElement) {
  try {
    input.showPicker();
  } catch {
    // The browser refused (e.g. an older browser): its own calendar icon still opens it.
  }
}

/** A date box: a click (or Enter / Space) opens the calendar. Dates are picked, never typed or pasted. */
export function DatePicker({ className = INPUT, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <input
      {...props}
      type="date"
      className={`${className} cursor-pointer`}
      onClick={(event) => openCalendar(event.currentTarget)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openCalendar(event.currentTarget);
        } else if (!DATE_KEYS.has(event.key)) event.preventDefault();
      }}
      onPaste={(event) => event.preventDefault()}
      onDrop={(event) => event.preventDefault()}
    />
  );
}

export function DateInput({ label, className, ...props }: { label: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <Field label={label} className={className}>
      <DatePicker {...props} />
    </Field>
  );
}

export function TextArea({ label, className, ...props }: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} className={className}>
      <textarea rows={3} className={TEXTAREA} {...props} />
    </Field>
  );
}

export function Select({ label, className, options, ...props }: { label: string; options: readonly { value: string; label: string }[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} className={className}>
      <select className={INPUT} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** A form inside a card: its fields, then Save / Cancel at the bottom. */
export function FormCard({ title, submitLabel, canSubmit = true, onSubmit, onCancel, children }: { title: string; submitLabel: string; canSubmit?: boolean; onSubmit: () => void; onCancel: () => void; children: ReactNode }) {
  return (
    <form
      className="animate-enter space-y-4 rounded-3xl border border-neutral-200 bg-white/60 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      <p className="text-sm font-semibold">{title}</p>
      {children}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
