"use client";

import { useState } from "react";
import { type Setting, saveSetting, setFeatureFlag, useSettings } from "@/lib/api/admin";
import { formatDateTime, humanize } from "@/lib/format";
import { INPUT, TEXTAREA } from "@/components/forms";
import { Button, ErrorState, LoadingState } from "@/components/ui";

/** Feature switches have no list of their own: they arrive among the settings under this prefix. */
const FLAG_PREFIX = "feature.";

const toText = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value, null, 2));

/** Reads the edited text back into the setting's own type (number, text, or JSON for lists and objects). */
function parseValue(original: unknown, text: string): { value: unknown } | null {
  if (typeof original === "number") return text.trim() !== "" && !Number.isNaN(Number(text)) ? { value: Number(text) } : null;
  if (typeof original === "string") return { value: text };
  try {
    return { value: JSON.parse(text) };
  } catch {
    return null;
  }
}

function SettingRow({ setting, canEdit }: { setting: Setting; canEdit: boolean }) {
  const [text, setText] = useState(toText(setting.value));
  const isFlag = setting.key.startsWith(FLAG_PREFIX);
  const isComplex = typeof setting.value === "object" && setting.value !== null;
  const parsed = parseValue(setting.value, text);
  const isChanged = text !== toText(setting.value);
  const label = humanize(setting.key.replace(FLAG_PREFIX, "").replace(/\./g, " "));

  const control =
    typeof setting.value === "boolean" ? (
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={setting.value}
          disabled={!canEdit}
          onChange={(event) => void (isFlag ? setFeatureFlag(setting.key.slice(FLAG_PREFIX.length), event.target.checked) : saveSetting(setting.key, event.target.checked))}
          className="size-4 accent-black"
        />
        {setting.value ? "On" : "Off"}
      </label>
    ) : (
      <form
        className="flex w-full items-start gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (parsed) void saveSetting(setting.key, parsed.value);
        }}
      >
        {isComplex ? (
          <textarea value={text} onChange={(event) => setText(event.target.value)} disabled={!canEdit} rows={3} aria-label={label} className={`${TEXTAREA} font-mono text-xs`} />
        ) : (
          <input value={text} onChange={(event) => setText(event.target.value)} disabled={!canEdit} type={typeof setting.value === "number" ? "number" : "text"} step="any" aria-label={label} className={INPUT} />
        )}
        {canEdit && isChanged && (
          <Button type="submit" disabled={!parsed} className="shrink-0">
            Save
          </Button>
        )}
      </form>
    );

  return (
    <li className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-neutral-500">{setting.description}</p>
        <p className="mt-0.5 text-[11px] text-neutral-400">Changed {formatDateTime(setting.updated_at)}</p>
      </div>
      {control}
    </li>
  );
}

/** §20.11 business settings: timers, follow-up days, VAT, Incoterm, validity, hours, opt-out rules, feature switches. */
export function BusinessSettings({ canEdit }: { canEdit: boolean }) {
  const { data: settings, error } = useSettings();
  if (error && !settings) return <ErrorState message={error.message} />;
  if (!settings) return <LoadingState />;
  return (
    <ul className="animate-enter panel divide-y divide-dashed divide-neutral-200 px-6 py-2">
      {settings.map((setting) => (
        <SettingRow key={`${setting.key}-${setting.updated_at}`} setting={setting} canEdit={canEdit} />
      ))}
    </ul>
  );
}
