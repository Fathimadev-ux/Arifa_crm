"use client";

import { Plus, X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { INPUT } from "@/components/forms";
import { humanize } from "@/lib/format";

const TIME = /^\d{2}:\d{2}$/;

/** One value in a pill box, with its unit written inside on the right ("3 hours", "5 %"). */
export function UnitInput({ value, unit, isNumber, label, disabled, onChange }: { value: string | number; unit?: string; isNumber: boolean; label: string; disabled: boolean; onChange: (value: string | number) => void }) {
  return (
    <div className="relative w-full">
      <input
        value={value}
        onChange={(event) => onChange(isNumber ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
        type={isNumber ? "number" : "text"}
        step="any"
        min={isNumber ? 0 : undefined}
        disabled={disabled}
        aria-label={label}
        className={`${INPUT} ${unit ? "pr-16" : ""}`}
      />
      {unit && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-neutral-400">{unit}</span>}
    </div>
  );
}

/** A list (follow-up days, opt-out words) as pills: × removes one, typing and Enter (or +) adds one. */
export function PillList({ values, unit, isNumber, label, disabled, onChange }: { values: (string | number)[]; unit?: string; isNumber: boolean; label: string; disabled: boolean; onChange: (values: (string | number)[]) => void }) {
  const [draft, setDraft] = useState("");
  const next = isNumber ? Number(draft) : draft.trim();
  const canAdd = draft.trim() !== "" && !(isNumber && Number.isNaN(next)) && !values.includes(next);

  const add = () => {
    if (!canAdd) return;
    const list = [...values, next];
    onChange(isNumber ? list.sort((a, b) => Number(a) - Number(b)) : list);
    setDraft("");
  };
  const addOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    add();
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {values.map((value) => (
        <span key={value} className="flex h-9 items-center gap-1 rounded-full bg-black pr-1.5 pl-4 text-sm text-white shadow-sm">
          {value}
          {unit && ` ${unit}`}
          {!disabled && (
            <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} aria-label={`Remove ${value}`} className="press grid size-6 place-items-center rounded-full hover:bg-white/20">
              <X className="size-3.5" />
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <span className="glass flex h-9 items-center rounded-full pr-1 pl-4 shadow-sm focus-within:bg-white focus-within:shadow-md">
          <input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={addOnEnter} type={isNumber ? "number" : "text"} min={isNumber ? 1 : undefined} placeholder="Add" aria-label={`Add to ${label}`} className="w-20 bg-transparent text-sm outline-none placeholder:text-neutral-400" />
          <button type="button" onClick={add} disabled={!canAdd} aria-label="Add" className="press grid size-7 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30">
            <Plus className="size-4" />
          </button>
        </span>
      )}
    </div>
  );
}

/** A small group of named values (business hours): a time picker for "09:00" values, a box for the rest. */
export function FieldGroup({ value, disabled, onChange }: { value: Record<string, string | number>; disabled: boolean; onChange: (value: Record<string, string | number>) => void }) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
      {Object.entries(value).map(([key, item]) => (
        <label key={key} className="block min-w-0">
          <span className="mb-1 block px-1 text-[11px] text-neutral-400">{humanize(key)}</span>
          <input
            value={item ?? ""}
            onChange={(event) => onChange({ ...value, [key]: typeof item === "number" ? Number(event.target.value) : event.target.value })}
            type={typeof item === "string" && TIME.test(item) ? "time" : typeof item === "number" ? "number" : "text"}
            disabled={disabled}
            className={`${INPUT} px-3`}
          />
        </label>
      ))}
    </div>
  );
}

/** A black on/off switch. */
export function Toggle({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="press flex items-center gap-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={`relative h-6 w-11 rounded-full shadow-inner transition-colors duration-300 ${checked ? "bg-black" : "bg-neutral-300"}`}>
        <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ease-(--ease-smooth) ${checked ? "translate-x-5" : ""}`} />
      </span>
      <span className="w-6 text-neutral-500">{checked ? "On" : "Off"}</span>
    </button>
  );
}
