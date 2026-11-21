"use client";

import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCollections, useDocuments } from "@/lib/api/cms";
import { Button, ErrorState, LoadingState, PageHeader, StatusPill, enterDelay } from "@/components/ui";
import { INPUT } from "@/components/forms";

const KEY_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;
const formatWhen = (iso: string) => new Date(iso).toLocaleString("en-AE", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** A new document needs its key: the short name in its address (e.g. ac-8325), lower case, never changed later. */
function NewDocument({ collection, existing }: { collection: string; existing: string[] }) {
  const router = useRouter();
  const [key, setKey] = useState("");
  const isTaken = existing.includes(key);
  const isValid = KEY_PATTERN.test(key) && !isTaken;
  return (
    <form
      className="animate-enter flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (isValid) router.push(`/content/${collection}/${key}`);
      }}
    >
      <label className="block">
        <span className="mb-1.5 block px-1 text-xs text-neutral-500">Key (in the address, e.g. ac-8325)</span>
        <input autoFocus value={key} onChange={(event) => setKey(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} className={`${INPUT} w-64`} />
      </label>
      <Button type="submit" disabled={!isValid}>
        Create
      </Button>
      {isTaken && <p className="pb-2.5 text-xs text-neutral-500">This key is already used</p>}
    </form>
  );
}

/** The documents of one content type, in display order, with their state. A one-document type opens straight away. */
export function CollectionScreen({ collection }: { collection: string }) {
  const router = useRouter();
  const { data: collections } = useCollections();
  const { data: documents, error } = useDocuments(collection);
  const [isAdding, setIsAdding] = useState(false);
  const info = collections?.find((item) => item.name === collection);

  // Site settings and other single types have one document, named after the type.
  useEffect(() => {
    if (info?.single) router.replace(`/content/${collection}/${documents?.[0]?.key ?? collection}`);
  }, [info, documents, collection, router]);

  if (error && !documents) return <ErrorState message={error.message} />;
  if (!documents || !collections) return <LoadingState />;
  if (!info) return <ErrorState message="This content type doesn't exist" />;

  return (
    <>
      <PageHeader title={info.title} subtitle={`${documents.length} ${documents.length === 1 ? "item" : "items"}`}>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="size-4" /> New
          </Button>
        )}
      </PageHeader>
      {isAdding && (
        <div className="mb-4">
          <NewDocument collection={collection} existing={documents.map((document) => document.key)} />
        </div>
      )}
      <ul className="animate-enter panel divide-y divide-dashed divide-neutral-200 px-3 py-2">
        {documents.length === 0 && <li className="px-3 py-8 text-center text-sm text-neutral-400">Nothing here yet</li>}
        {documents.map((document, index) => (
          <li key={document.key} className="animate-enter" style={enterDelay(index)}>
            <Link href={`/content/${collection}/${document.key}`} className="group flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors hover:bg-black/[0.03]">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium transition-transform duration-500 group-hover:translate-x-1">{document.title}</span>
                <span className="block text-xs text-neutral-400">
                  {document.key} · changed {formatWhen(document.updated_at)}
                  {document.published_version && ` · live version ${document.published_version}`}
                </span>
              </span>
              <StatusPill status={document.status} />
              <ArrowRight className="size-4 shrink-0 text-neutral-300 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-black" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
