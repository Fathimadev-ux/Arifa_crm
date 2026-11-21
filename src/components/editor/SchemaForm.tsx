"use client";

import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { INPUT, TEXTAREA } from "@/components/forms";
import { MediaField } from "@/components/editor/MediaField";

/**
 * Draws an edit form from a content type's JSON Schema (GET /v1/cms/collections), so a new field or type on the
 * backend needs no code here. English is the full document; on the Arabic tab only text is translated (codes,
 * numbers and media are shared, CMS_API.md §2), lists follow the English items one by one, and an empty Arabic
 * field falls back to English.
 */
export type JsonSchema = {
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  format?: string;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  $ref?: string;
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
};
export type Lang = "en" | "ar";
type Value = unknown;

interface Ctx {
  root: JsonSchema;
  lang: Lang;
}

const LONG_TEXT = 200;
const humanize = (key: string) => key.replace(/_/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());

/** Follows $ref (to $defs / definitions) and takes the non-null branch of anyOf / oneOf. */
export function resolve(schema: JsonSchema | undefined, root: JsonSchema): JsonSchema {
  let node = schema ?? {};
  for (let depth = 0; depth < 10; depth++) {
    if (node.$ref) {
      const name = node.$ref.split("/").pop() ?? "";
      node = { ...(root.$defs?.[name] ?? root.definitions?.[name] ?? {}), title: node.title ?? root.$defs?.[name]?.title, description: node.description };
    } else if (node.anyOf || node.oneOf) {
      const branch = (node.anyOf ?? node.oneOf)!.find((option) => option.type !== "null") ?? {};
      node = { ...branch, title: node.title ?? branch.title, description: node.description ?? branch.description };
    } else break;
  }
  return node;
}

const typeOf = (schema: JsonSchema) => (Array.isArray(schema.type) ? schema.type.find((type) => type !== "null") : schema.type) ?? (schema.properties ? "object" : "string");
/** A MediaRef: {asset_id} from the library or {url} for an outside link. */
const isMedia = (schema: JsonSchema) => typeOf(schema) === "object" && Boolean(schema.properties?.asset_id || schema.properties?.url) && Object.keys(schema.properties ?? {}).length <= 3;
/** Fields that hold words someone could translate (anything else is shared between languages). */
const isTranslatable = (schema: JsonSchema, root: JsonSchema): boolean => {
  const node = resolve(schema, root);
  const type = typeOf(node);
  if (type === "string") return !node.enum && node.format !== "date" && node.format !== "date-time" && node.format !== "uri";
  if (type === "array") return isTranslatable(node.items ?? {}, root);
  if (type === "object") return !isMedia(node) && Object.values(node.properties ?? {}).some((child) => isTranslatable(child, root));
  return false;
};

function Label({ title, required, hint }: { title: string; required?: boolean; hint?: string }) {
  return (
    <span className="mb-1.5 block px-1 text-xs text-neutral-500">
      {title}
      {required && <span className="text-black"> *</span>}
      {hint && <span className="block text-[11px] text-neutral-400">{hint}</span>}
    </span>
  );
}

function Shared() {
  return <p className="px-1 text-xs text-neutral-400">Same as English (shared)</p>;
}

/** One field of any kind: text, number, switch, choice, date, media, group or list. */
function Field({ name, schema: raw, value, english, required, ctx, onChange }: { name: string; schema: JsonSchema; value: Value; english: Value; required?: boolean; ctx: Ctx; onChange: (value: Value) => void }) {
  const schema = resolve(raw, ctx.root);
  const type = typeOf(schema);
  const title = schema.title || humanize(name);
  const isArabic = ctx.lang === "ar";
  const rtl = isArabic ? "rtl" : undefined;

  if (isMedia(schema)) return isArabic ? <div><Label title={title} /><Shared /></div> : <MediaField title={title} value={value as Record<string, string> | null} onChange={onChange} />;
  if (type === "object") return <Group title={title} schema={schema} value={value} english={english} ctx={ctx} onChange={onChange} />;
  if (type === "array") return <List title={title} schema={schema} value={value} english={english} ctx={ctx} onChange={onChange} />;
  if (isArabic && !isTranslatable(schema, ctx.root)) {
    return (
      <div>
        <Label title={title} />
        <Shared />
      </div>
    );
  }

  if (type === "boolean") {
    return (
      <label className="flex cursor-pointer items-center gap-3 px-1 py-2 text-sm">
        <button type="button" role="switch" aria-checked={Boolean(value)} onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${value ? "bg-black" : "bg-neutral-300"}`}>
          <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-300 ${value ? "translate-x-5" : ""}`} />
        </button>
        {title}
      </label>
    );
  }
  if (schema.enum) {
    return (
      <label className="block">
        <Label title={title} required={required} />
        <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value || undefined)} className={INPUT}>
          <option value="">Not set</option>
          {schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {humanize(String(option))}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (type === "integer" || type === "number") {
    return (
      <label className="block">
        <Label title={title} required={required} />
        <input type="number" step={type === "integer" ? 1 : "any"} min={schema.minimum} max={schema.maximum} value={value === undefined || value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} className={INPUT} />
      </label>
    );
  }
  const placeholder = isArabic && typeof english === "string" ? english : undefined;
  // D55: a section's id is the page's DOM id and the id the AI scrolls to; renaming it breaks the website.
  const hint = name === "section_id" ? "The website and the AI use this id: don't rename it" : schema.description;
  const isLong = (schema.maxLength ?? 0) > LONG_TEXT;
  const text = typeof value === "string" ? value : "";
  return (
    <label className="block">
      <Label title={title} required={required && !isArabic} hint={hint} />
      {isLong ? (
        <textarea dir={rtl} rows={3} value={text} placeholder={placeholder} maxLength={schema.maxLength} onChange={(event) => onChange(event.target.value)} className={TEXTAREA} />
      ) : (
        <input dir={rtl} type={schema.format === "date" ? "date" : "text"} value={text} placeholder={placeholder} maxLength={schema.maxLength} onChange={(event) => onChange(event.target.value)} className={INPUT} />
      )}
    </label>
  );
}

/** The fields of an object; nested groups fold so long documents stay readable. */
export function Fields({ schema, value, english, ctx, onChange }: { schema: JsonSchema; value: Value; english: Value; ctx: Ctx; onChange: (value: Value) => void }) {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, Value>;
  const englishRecord = (english && typeof english === "object" ? english : {}) as Record<string, Value>;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Object.entries(schema.properties ?? {}).map(([name, child]) => {
        const node = resolve(child, ctx.root);
        const isWide = ["object", "array"].includes(typeOf(node)) || (node.maxLength ?? 0) > LONG_TEXT;
        return (
          <div key={name} className={isWide ? "md:col-span-2" : undefined}>
            <Field name={name} schema={child} value={record[name]} english={englishRecord[name]} required={schema.required?.includes(name)} ctx={ctx} onChange={(next) => onChange({ ...record, [name]: next })} />
          </div>
        );
      })}
    </div>
  );
}

function Group({ title, schema, value, english, ctx, onChange }: { title: string; schema: JsonSchema; value: Value; english: Value; ctx: Ctx; onChange: (value: Value) => void }) {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <fieldset className="rounded-3xl border border-neutral-200 bg-white/40 p-4">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className="press mb-1 flex w-full items-center justify-between gap-2 text-left text-sm font-semibold">
        {title}
        <ChevronDown className={`size-4 transition-transform duration-300 ${isOpen ? "" : "-rotate-90"}`} />
      </button>
      {isOpen && (
        <div className="pt-3">
          <Fields schema={schema} value={value} english={english} ctx={ctx} onChange={onChange} />
        </div>
      )}
    </fieldset>
  );
}

/** Repeatable items. In Arabic the list follows the English items (translated one by one). */
function List({ title, schema, value, english, ctx, onChange }: { title: string; schema: JsonSchema; value: Value; english: Value; ctx: Ctx; onChange: (value: Value) => void }) {
  const itemSchema = resolve(schema.items, ctx.root);
  const items = Array.isArray(value) ? [...value] : [];
  const englishItems = Array.isArray(english) ? english : [];
  const isPrimitive = !["object", "array"].includes(typeOf(itemSchema)) && !isMedia(itemSchema);
  // Arabic lists of objects mirror the English items; a list of plain words (e.g. synonyms) is its own per language.
  const followsEnglish = ctx.lang === "ar" && !isPrimitive;
  if (ctx.lang === "ar" && !isTranslatable(schema, ctx.root)) {
    return (
      <div>
        <Label title={title} />
        <Shared />
      </div>
    );
  }
  const count = followsEnglish ? englishItems.length : items.length;
  const set = (index: number, next: Value) => onChange(Object.assign(Array.from({ length: Math.max(items.length, index + 1) }, (_, i) => items[i] ?? (isPrimitive ? "" : {})), { [index]: next }));
  const move = (from: number, to: number) => {
    const next = [...items];
    [next[from], next[to]] = [next[to], next[from]];
    onChange(next);
  };
  const itemTitle = (index: number) => {
    const source = (englishItems[index] ?? items[index]) as Record<string, unknown> | undefined;
    const label = source && typeof source === "object" ? source.heading ?? source.title ?? source.name ?? source.question ?? source.label ?? source.section_id : undefined;
    return `${itemSchema.title || "Item"} ${index + 1}${label ? ` · ${String(label)}` : ""}`;
  };

  return (
    <div className="space-y-2">
      <Label title={title} />
      {count === 0 && <p className="px-1 text-xs text-neutral-400">{followsEnglish ? "Add items in English first" : "None yet"}</p>}
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={isPrimitive ? "flex items-center gap-2" : "rounded-3xl border border-neutral-200 bg-white/50 p-4"}>
          {!isPrimitive && <p className="mb-3 text-xs font-semibold">{itemTitle(index)}</p>}
          <div className={isPrimitive ? "min-w-0 flex-1" : ""}>
            {isPrimitive ? (
              <input dir={ctx.lang === "ar" ? "rtl" : undefined} value={String(items[index] ?? "")} maxLength={itemSchema.maxLength} onChange={(event) => set(index, event.target.value)} aria-label={`${title} ${index + 1}`} className={INPUT} />
            ) : isMedia(itemSchema) ? (
              <MediaField title={itemTitle(index)} value={items[index] as Record<string, string> | null} onChange={(next) => set(index, next)} />
            ) : (
              <Fields schema={itemSchema} value={items[index]} english={englishItems[index]} ctx={ctx} onChange={(next) => set(index, next)} />
            )}
          </div>
          {!followsEnglish && (
            <div className={`flex gap-1 ${isPrimitive ? "" : "mt-3 justify-end border-t border-dashed border-neutral-200 pt-3"}`}>
              <button type="button" disabled={index === 0} onClick={() => move(index, index - 1)} aria-label="Move up" className="press grid size-8 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30">
                <ArrowUp className="size-3.5" />
              </button>
              <button type="button" disabled={index === count - 1} onClick={() => move(index, index + 1)} aria-label="Move down" className="press grid size-8 place-items-center rounded-full hover:bg-black/5 disabled:opacity-30">
                <ArrowDown className="size-3.5" />
              </button>
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Remove" className="press grid size-8 place-items-center rounded-full hover:bg-black/5">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      ))}
      {!followsEnglish && (
        <button type="button" onClick={() => onChange([...items, isPrimitive ? "" : isMedia(itemSchema) ? null : {}])} className="press flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-neutral-600 hover:bg-black/5 hover:text-black">
          <Plus className="size-3.5" /> Add {(itemSchema.title || "item").toLowerCase()}
        </button>
      )}
    </div>
  );
}

/** Drops empty text and empty groups, so a cleared field is removed (Arabic then falls back to English). */
export function prune(value: Value): Value {
  if (typeof value === "string") return value.trim() === "" ? undefined : value;
  if (Array.isArray(value)) return value.map((item) => prune(item) ?? (typeof item === "object" ? {} : null)).filter((item) => item !== null);
  if (value && typeof value === "object") {
    const entries = Object.entries(value).map(([key, child]) => [key, prune(child)] as const).filter(([, child]) => child !== undefined && !(typeof child === "object" && child !== null && !Array.isArray(child) && Object.keys(child).length === 0));
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value;
}
