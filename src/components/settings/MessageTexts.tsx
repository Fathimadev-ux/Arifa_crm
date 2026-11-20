"use client";

import { History, Languages, RotateCcw } from "lucide-react";
import { useState } from "react";
import { TEXT_GROUPS, type TextChangeOut, type TextOut, resetText, saveText, translateMissing, useTextHistory, useTexts } from "@/lib/api/texts";
import { formatDateTime, humanize } from "@/lib/format";
import { useStaffNames } from "@/hooks/useStaffNames";
import { TEXTAREA } from "@/components/forms";
import { Button, ErrorState, LoadingState, SegmentedControl } from "@/components/ui";

type Group = (typeof TEXT_GROUPS)[number]["id"];

const LANGUAGE_NAMES: Record<string, string> = { ar: "Arabic", hi: "Hindi", ta: "Tamil", zh: "Chinese", si: "Sinhala" };
/** In words, so the state never depends on colour alone. */
const STATUS_WORDS: Record<string, string> = {
  "built-in": "Built-in",
  edited: "Edited",
  translated: "Translated",
  outdated: "Old text still sent",
  missing: "English sent",
};
const NEEDS_ATTENTION = ["outdated", "missing"];

const placeholdersIn = (text: string) => new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
/** A history entry's text, whichever key the backend used. */
const textOf = (value: Record<string, unknown> | null) => String(value?.text ?? value?.en ?? Object.values(value ?? {}).find((item) => typeof item === "string") ?? "");

function LanguageChips({ text }: { text: TextOut }) {
  if (text.group === "staff") return <p className="text-xs text-neutral-400">English only</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {text.languages.map((language) => (
        <span
          key={language.language}
          title={language.text ?? undefined}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${NEEDS_ATTENTION.includes(language.status) ? "bg-black text-white" : "bg-black/5 text-neutral-600"}`}
        >
          {LANGUAGE_NAMES[language.language] ?? language.language.toUpperCase()} · {STATUS_WORDS[language.status] ?? humanize(language.status)}
        </span>
      ))}
    </div>
  );
}

function TextHistory({ textKey }: { textKey: string }) {
  const { data: changes } = useTextHistory(textKey);
  const { nameOf } = useStaffNames();
  if (!changes) return <div className="h-12 animate-pulse rounded-2xl bg-neutral-100" />;
  if (changes.length === 0) return <p className="text-sm text-neutral-400">No changes yet</p>;
  return (
    <ul className="divide-y divide-dashed divide-neutral-200">
      {changes.map((change: TextChangeOut) => (
        <li key={`${change.at}-${change.action}`} className="space-y-1 py-3 text-sm">
          <p className="text-xs text-neutral-500">
            {formatDateTime(change.at)} · {change.actor_type === "staff" ? nameOf(change.actor_id) : humanize(change.actor_type)} · {humanize(change.action.split(".").at(-1) ?? change.action)}
          </p>
          {change.before && <p className="text-neutral-400 line-through">{textOf(change.before)}</p>}
          {change.after && <p>{textOf(change.after)}</p>}
        </li>
      ))}
    </ul>
  );
}

/** One text opened: edit the English (placeholders must stay), go back to the built-in wording, or read its history. */
function TextEditor({ text, canEdit, onClose }: { text: TextOut; canEdit: boolean; onClose: () => void }) {
  const { nameOf } = useStaffNames();
  const [draft, setDraft] = useState(text.en);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const used = placeholdersIn(draft);
  const missing = text.placeholders.filter((name) => !used.has(name));
  const unknown = [...used].filter((name) => !text.placeholders.includes(name));
  const canSave = canEdit && draft.trim() !== "" && draft !== text.en && missing.length === 0 && unknown.length === 0;
  const isEdited = text.en !== text.builtin_en;

  return (
    <div className="animate-enter space-y-4 rounded-3xl border border-neutral-200 bg-white/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{humanize(text.key.split(".").at(-1) ?? text.key)}</p>
          <p className="text-xs text-neutral-500">{text.note}</p>
        </div>
        <button onClick={onClose} className="press rounded-full px-3 py-1.5 text-xs text-neutral-500 hover:bg-black/5 hover:text-black">
          Close
        </button>
      </div>

      <textarea value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!canEdit} rows={4} maxLength={2000} aria-label="English text" className={TEXTAREA} />

      {text.placeholders.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-neutral-500">Keep these:</span>
          {text.placeholders.map((name) => (
            <span key={name} className={`rounded-full px-2.5 py-1 font-mono ${used.has(name) ? "bg-black/5" : "bg-black text-white"}`}>
              {`{${name}}`}
              {!used.has(name) && " missing"}
            </span>
          ))}
        </div>
      )}
      {unknown.length > 0 && <p className="text-xs font-medium">Not allowed here: {unknown.map((name) => `{${name}}`).join(", ")}</p>}
      <p className="text-xs text-neutral-400">No prices in texts: prices only ever come from the approved quote.</p>

      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Button disabled={!canSave} onClick={() => void saveText(text.key, draft.trim(), text.group !== "staff")}>
            Save
          </Button>
        )}
        {canEdit && isEdited && (
          <Button variant="secondary" onClick={() => void resetText(text.key)}>
            <RotateCcw className="size-4" /> Back to built-in
          </Button>
        )}
        <Button variant="secondary" onClick={() => setIsHistoryOpen((open) => !open)}>
          <History className="size-4" /> History
        </Button>
      </div>
      {isEdited && <p className="text-xs text-neutral-500">Built-in: {text.builtin_en}</p>}
      {text.updated_at && (
        <p className="text-xs text-neutral-400">
          Last changed {formatDateTime(text.updated_at)}
          {text.updated_by && ` by ${nameOf(text.updated_by)}`}
        </p>
      )}
      {isHistoryOpen && <TextHistory textKey={text.key} />}
    </div>
  );
}

/** §5.2 the wording of the AI's fixed phrases, buyer messages and staff alerts. Legal and opt-out wording isn't here. */
export function MessageTexts({ canEdit }: { canEdit: boolean }) {
  const { data: texts, error } = useTexts(true);
  const [group, setGroup] = useState<Group>("ai");
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (error && !texts) return <ErrorState message={error.message} />;
  if (!texts) return <LoadingState />;

  const visible = texts.filter((text) => text.group === group);
  const untranslated = texts.filter((text) => text.languages.some((language) => NEEDS_ATTENTION.includes(language.status))).length;
  const openText = texts.find((text) => text.key === openKey);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl options={TEXT_GROUPS} value={group} onChange={(next) => (setGroup(next), setOpenKey(null))} label="Group" />
        {canEdit && untranslated > 0 && (
          <Button variant="secondary" onClick={() => void translateMissing()}>
            <Languages className="size-4" /> Translate missing ({untranslated})
          </Button>
        )}
      </div>
      <p className="px-1 text-xs text-neutral-500">{TEXT_GROUPS.find((item) => item.id === group)?.hint}. Write in English; the AI translates.</p>

      {openText && <TextEditor key={`${openText.key}-${openText.en_version}`} text={openText} canEdit={canEdit} onClose={() => setOpenKey(null)} />}

      <ul className="animate-enter panel divide-y divide-dashed divide-neutral-200 px-6 py-1 md:px-8">
        {visible.length === 0 && <li className="py-6 text-sm text-neutral-400">No texts in this group</li>}
        {visible.map((text) => (
          <li key={text.key}>
            <button onClick={() => setOpenKey(text.key)} className={`group w-full space-y-2 py-4 text-left ${openKey === text.key ? "opacity-50" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium transition-transform duration-500 ease-(--ease-smooth) group-hover:translate-x-1">
                  {humanize(text.key.split(".").at(-1) ?? text.key)}
                  {text.en !== text.builtin_en && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-neutral-600">Edited</span>}
                </p>
                <p className="text-xs text-neutral-400">{text.note}</p>
              </div>
              <p className="text-sm text-neutral-600">{text.en}</p>
              <LanguageChips text={text} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
