"use client";

import { ArrowLeft, Eye, History, Languages, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  type DocumentOut, type LocalizedData, discardDraft, publishDocument, restoreVersion, saveDraft, startPreview, unpublishDocument, useCollections, useDocument, useVersions,
} from "@/lib/api/cms";
import { showToast } from "@/components/Toaster";
import { Button, ErrorState, LoadingState, SegmentedControl, StatusPill } from "@/components/ui";
import { Fields, type JsonSchema, type Lang, prune } from "@/components/editor/SchemaForm";

const LANGUAGES = [
  { id: "en", label: "English", icon: Languages },
  { id: "ar", label: "العربية · Arabic" },
] as const;
const formatWhen = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
const statusOf = (doc: DocumentOut) => (doc.draft && doc.published ? "changed" : doc.published ? "published" : "draft");

/** Every version, newest first; an earlier one can be copied into the draft and published again. */
function Versions({ collection, docKey }: { collection: string; docKey: string }) {
  const { data: versions } = useVersions(collection, docKey);
  if (!versions) return <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />;
  return (
    <ul className="divide-y divide-dashed divide-neutral-200">
      {versions.map((version) => (
        <li key={`${version.number}-${version.status}`} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span>
            <span className="font-medium">Version {version.number}</span> <StatusPill status={version.status} />
            <span className="block text-xs text-neutral-500">
              {version.status === "draft" ? `Saved ${formatWhen(version.saved_at)} by ${version.author}` : `Published ${formatWhen(version.published_at)} by ${version.published_by ?? version.author}`}
              {version.note && ` · “${version.note}”`}
            </span>
          </span>
          {version.status !== "draft" && (
            <button onClick={() => void restoreVersion(collection, docKey, version.number)} className="press flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium hover:bg-black/5">
              <RotateCcw className="size-3.5" /> Restore into draft
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** The form for one document, started from its draft (or the live version, or empty for a new one). */
function EditorForm({ collection, docKey, schema, doc, isNew, isSingle }: { collection: string; docKey: string; schema: JsonSchema; doc: DocumentOut | null; isNew: boolean; isSingle: boolean }) {
  const router = useRouter();
  const start = (doc?.draft ?? doc?.published)?.data as LocalizedData | undefined;
  const [data, setData] = useState<LocalizedData>(() => structuredClone(start ?? { en: {}, ar: {} }));
  // Position in the content list and on the website (sort_order); left as it is unless the editor changes it.
  const [sortOrder, setSortOrder] = useState(doc?.sort_order ?? 0);
  const [lang, setLang] = useState<Lang>("en");
  const [note, setNote] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const baseline = JSON.stringify(start ?? { en: {}, ar: {} });
  const isOrderChanged = !isSingle && sortOrder !== (doc?.sort_order ?? 0);
  const isChanged = JSON.stringify(data) !== baseline || isOrderChanged;
  const english = data.en ?? {};
  const title = String(english.title ?? english.name ?? english.question ?? english.company_name ?? docKey);
  // A draft may be unfinished, but a required English field (marked *) must be filled before it goes live.
  const isBlank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && value.trim() === "") || (Array.isArray(value) && value.length === 0);
  const missing = (schema.required ?? []).filter((field) => isBlank(english[field])).map((field) => schema.properties?.[field]?.title ?? field);

  const busy = async <T,>(work: () => Promise<T>) => {
    setIsBusy(true);
    try {
      return await work();
    } finally {
      setIsBusy(false);
    }
  };
  const save = () => saveDraft(collection, docKey, { en: (prune(data.en) ?? {}) as Record<string, unknown>, ar: (prune(data.ar) ?? {}) as Record<string, unknown> }, doc?.draft?.revision ?? null, isSingle ? undefined : sortOrder);
  /** Unsaved edits are saved first, so what goes live is what is on screen. */
  const publish = () =>
    busy(async () => {
      if (isChanged && !(await save())) return;
      if (await publishDocument(collection, docKey, note)) setNote("");
    });
  const preview = () =>
    busy(async () => {
      if (isChanged && !(await save())) return;
      const token = await startPreview();
      if (token?.url) window.open(token.url, "_blank", "noopener");
      else if (token) showToast("The website address isn't set on the backend yet, so there's no page to preview");
    });
  const discard = () =>
    busy(async () => {
      if (!(await discardDraft(collection, docKey))) return;
      if (!doc?.published) router.push(`/content/${collection}`);
    });

  return (
    <>
      <div className="animate-enter sticky top-0 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 px-1 py-2.5 md:-mx-4 md:px-4">
        <SegmentedControl options={LANGUAGES} value={lang} onChange={setLang} label="Language" />
        <span className="flex-1" />
        {isChanged && <span className="text-xs font-medium text-neutral-500">Unsaved changes</span>}
        <Button variant="secondary" disabled={!isChanged || isBusy} onClick={() => void busy(save)}>
          Save draft
        </Button>
        <Button variant="secondary" disabled={isBusy} onClick={() => void preview()}>
          <Eye className="size-4" /> Preview
        </Button>
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Note (optional)" aria-label="Publish note" maxLength={500} className="glass h-10 w-44 rounded-full px-4 text-sm shadow-sm outline-none placeholder:text-neutral-400 focus:bg-white" />
        <Button disabled={isBusy || missing.length > 0 || (!isChanged && !doc?.draft)} onClick={() => void publish()}>
          <Send className="size-4" /> Publish
        </Button>
      </div>
      {missing.length > 0 && <p className="mb-3 px-1 text-sm font-medium">Fill in before publishing (English): {missing.join(", ")}</p>}

      <p className="mb-3 px-1 text-xs text-neutral-500">
        {lang === "ar" ? "Translate the text here. An empty field shows the English text on the Arabic page; codes, numbers and media are shared. " : ""}
        No prices in content: prices only reach a buyer inside an approved quotation (percentages are fine).
      </p>
      <section className="animate-enter panel p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-medium tracking-tight">{title}</h2>
          {!isSingle && (
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              Order in lists
              <input type="number" min={0} step={1} value={sortOrder} onChange={(event) => setSortOrder(Number(event.target.value) || 0)} className="glass h-9 w-20 rounded-full px-3 text-sm shadow-sm outline-none focus:bg-white" />
            </label>
          )}
        </div>
        <Fields schema={schema} value={data[lang]} english={english} ctx={{ root: schema, lang }} onChange={(next) => setData((current) => ({ ...current, [lang]: next as Record<string, unknown> }))} />
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setShowVersions((open) => !open)} disabled={isNew}>
          <History className="size-4" /> Versions
        </Button>
        {doc?.draft && (
          <Button variant="secondary" disabled={isBusy} onClick={() => void discard()}>
            <Trash2 className="size-4" /> Discard draft
          </Button>
        )}
        {doc?.published && (
          <Button variant="secondary" disabled={isBusy} onClick={() => void busy(() => unpublishDocument(collection, docKey))}>
            <Undo2 className="size-4" /> Take off the website
          </Button>
        )}
      </div>
      {showVersions && (
        <section className="animate-enter panel mt-4 p-5">
          <h2 className="mb-2 text-lg font-medium tracking-tight">Versions</h2>
          <Versions collection={collection} docKey={docKey} />
        </section>
      )}
    </>
  );
}

/** One document: draft and live state, the form per language, and its actions. A new key opens an empty draft. */
export function DocumentEditor({ collection, docKey }: { collection: string; docKey: string }) {
  const { data: collections } = useCollections();
  const { data: doc, error } = useDocument(collection, docKey);
  const info = collections?.find((item) => item.name === collection);
  const isNew = error?.status === 404;

  if (error && !isNew) return <ErrorState message={error.message} />;
  if (!collections || (!doc && !isNew)) return <LoadingState />;
  if (!info) return <ErrorState message="This content type doesn't exist" />;

  return (
    <>
      <header className="animate-enter mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {!info.single && (
            <Link href={`/content/${collection}`} className="group mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-black">
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" /> {info.title}
            </Link>
          )}
          <h1 className="text-4xl font-light tracking-tight md:text-5xl">{info.single ? info.title : docKey}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            {isNew ? "New: not saved yet" : doc && <StatusPill status={statusOf(doc)} />}
            {doc?.published && <span>Live version {doc.published.number} · published {formatWhen(doc.published.published_at)}</span>}
            {doc?.draft && <span>· draft saved {formatWhen(doc.draft.saved_at)} by {doc.draft.author}</span>}
          </p>
        </div>
      </header>
      {/* A fresh form whenever the stored draft or live version changes (after a save, publish or restore). */}
      <EditorForm key={`${doc?.draft?.revision ?? "-"}:${doc?.published?.number ?? "-"}:${doc?.draft?.number ?? "-"}`} collection={collection} docKey={docKey} schema={info.json_schema as JsonSchema} doc={doc ?? null} isNew={isNew} isSingle={info.single} />
    </>
  );
}
