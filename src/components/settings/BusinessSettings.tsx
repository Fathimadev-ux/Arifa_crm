"use client";

import { useState } from "react";
import { type Setting, saveSetting, setFeatureFlag, useSettings } from "@/lib/api/admin";
import { formatDateTime, humanize } from "@/lib/format";
import { Button, ErrorState, LoadingState } from "@/components/ui";
import { FieldGroup, PillList, Toggle, UnitInput } from "@/components/settings/SettingControls";

/**
 * Feature switches have no list of their own: they arrive among the settings as "features.<key>" (the live
 * backend's names) and save through PUT /v1/feature-flags/<key> with {enabled}.
 */
const FLAG_PREFIX = "features.";

/** Plain names and units for the known settings; a new one from the backend still shows with a tidied key. */
const KNOWN: Record<string, { label: string; unit?: string }> = {
  approval_sla_hours: { label: "Approval time limit", unit: "hours" },
  follow_up_days: { label: "Follow-up days", unit: "days" },
  vat_rate_pct: { label: "VAT", unit: "%" },
  default_incoterm: { label: "Default Incoterm" },
  quote_validity_days: { label: "Quote valid for", unit: "days" },
  business_hours: { label: "Business hours" },
  opt_out_keywords: { label: "Opt-out words" },
  "features.scraping": { label: "Price scraper" },
  "features.news_digest": { label: "News digest" },
  "features.voice_calls": { label: "AI voice calls" },
};

const nameOf = (key: string) => KNOWN[key]?.label ?? humanize(key.replace(FLAG_PREFIX, "").replace(/\./g, " ")).replace(/\b(sla|vat|ai|fx)\b/gi, (word) => word.toUpperCase());

type Value = Setting["value"];
const isList = (value: Value): value is (string | number)[] => Array.isArray(value);
const isGroup = (value: Value): value is Record<string, string | number> => typeof value === "object" && value !== null && !Array.isArray(value);

function SettingRow({ setting, canEdit }: { setting: Setting; canEdit: boolean }) {
  const [draft, setDraft] = useState<Value>(setting.value);
  const label = nameOf(setting.key);
  const unit = KNOWN[setting.key]?.unit;
  const isChanged = JSON.stringify(draft) !== JSON.stringify(setting.value);
  // SettingOut.value has no fixed type, so the backend may send null (not set yet): it shows as an empty box.
  const isValid = draft !== "" && draft !== null && !(isList(draft) && draft.length === 0);
  const isDisabled = !canEdit;

  const save = (value: Value) =>
    void (setting.key.startsWith(FLAG_PREFIX) && typeof value === "boolean" ? setFeatureFlag(setting.key.slice(FLAG_PREFIX.length), value) : saveSetting(setting.key, value));

  const control =
    typeof setting.value === "boolean" ? (
      <Toggle checked={setting.value} label={label} disabled={isDisabled} onChange={save} />
    ) : isList(draft) ? (
      <PillList values={draft} unit={unit} isNumber={typeof (setting.value as unknown[])[0] === "number"} label={label} disabled={isDisabled} onChange={setDraft} />
    ) : isGroup(draft) ? (
      <FieldGroup value={draft} disabled={isDisabled} onChange={setDraft} />
    ) : (
      <UnitInput value={(draft ?? "") as string | number} unit={unit} isNumber={typeof setting.value === "number"} label={label} disabled={isDisabled} onChange={setDraft} />
    );

  return (
    <li className="group grid grid-cols-1 gap-3 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center">
      <div className="min-w-0" title={`Changed ${formatDateTime(setting.updated_at)}`}>
        <p className="text-sm font-medium transition-transform duration-500 ease-(--ease-smooth) group-hover:translate-x-1">{label}</p>
        <p className="text-xs text-neutral-500">{setting.description}</p>
      </div>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) save(draft);
        }}
      >
        {control}
        {canEdit && isChanged && (
          <Button type="submit" disabled={!isValid} className="shrink-0">
            Save
          </Button>
        )}
      </form>
    </li>
  );
}

/** §20.11 business settings: timers, follow-up days, VAT, Incoterm, validity, hours, opt-out rules, feature switches. */
export function BusinessSettings({ canEdit }: { canEdit: boolean }) {
  const { data: settings, error } = useSettings();
  if (error && !settings) return <ErrorState message={error.message} />;
  if (!settings) return <LoadingState />;
  return (
    <ul className="animate-enter panel divide-y divide-dashed divide-neutral-200 px-6 py-1 md:px-8">
      {settings.map((setting) => (
        <SettingRow key={`${setting.key}-${setting.updated_at}`} setting={setting} canEdit={canEdit} />
      ))}
    </ul>
  );
}
