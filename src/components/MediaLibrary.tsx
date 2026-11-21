"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { MEDIA_ACCEPT, type MediaItem, saveAlt, uploadMedia, useMedia } from "@/lib/api/cms";
import { INPUT } from "@/components/forms";
import { MediaThumb } from "@/components/editor/MediaField";
import { Button, ErrorState, LoadingState, PageHeader, SegmentedControl, enterDelay } from "@/components/ui";

const KINDS = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "video", label: "Videos" },
  { id: "application", label: "PDFs and files" },
] as const;
type Kind = (typeof KINDS)[number]["id"];

const sizeOf = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** One file: preview, details and its alt text per language (what the picture shows, for screen readers and search). */
function MediaCard({ item, index }: { item: MediaItem; index: number }) {
  const [altEn, setAltEn] = useState(item.alt.en ?? "");
  const [altAr, setAltAr] = useState(item.alt.ar ?? "");
  const isChanged = altEn !== (item.alt.en ?? "") || altAr !== (item.alt.ar ?? "");
  return (
    <li className="animate-enter lift panel space-y-3 p-4" style={enterDelay(index)}>
      <div className="flex items-start gap-3">
        <MediaThumb item={item} size="size-20" />
        <div className="min-w-0 text-xs text-neutral-500">
          <p className="truncate text-sm font-medium text-black" title={item.filename}>
            {item.filename}
          </p>
          <p>{item.content_type}</p>
          <p>
            {sizeOf(item.size_bytes)}
            {item.width && item.height && ` · ${item.width}×${item.height}`}
          </p>
          <a href={item.src} target="_blank" rel="noreferrer" className="underline hover:text-black">
            Open
          </a>
        </div>
      </div>
      <input value={altEn} onChange={(event) => setAltEn(event.target.value)} placeholder="Alt text (English)" aria-label="Alt text in English" className={INPUT} />
      <input dir="rtl" value={altAr} onChange={(event) => setAltAr(event.target.value)} placeholder="النص البديل (Arabic)" aria-label="Alt text in Arabic" className={INPUT} />
      {isChanged && (
        <Button className="w-full" onClick={() => void saveAlt(item, Object.fromEntries(Object.entries({ en: altEn.trim(), ar: altAr.trim() }).filter(([, text]) => text)))}>
          Save alt text
        </Button>
      )}
    </li>
  );
}

/** §3 Media: images up to 15 MB, videos 300 MB, PDFs 30 MB, 3D models 50 MB, sent straight from the browser to storage. */
export function MediaLibrary() {
  const [kind, setKind] = useState<Kind>("all");
  const { data: media, error } = useMedia(kind === "all" ? undefined : kind);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setIsUploading(true);
    for (const file of Array.from(files)) await uploadMedia(file, "");
    setIsUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <>
      <PageHeader title="Media library" subtitle="Images up to 15 MB, videos 300 MB, PDFs 30 MB, 3D models (GLB) 50 MB">
        <input ref={fileInput} type="file" accept={MEDIA_ACCEPT} multiple hidden onChange={(event) => void upload(event.target.files)} />
        <Button disabled={isUploading} onClick={() => fileInput.current?.click()}>
          <Upload className="size-4" /> {isUploading ? "Uploading…" : "Upload"}
        </Button>
      </PageHeader>
      <div className="mb-4">
        <SegmentedControl options={KINDS} value={kind} onChange={setKind} label="File type" />
      </div>
      {error && !media ? (
        <ErrorState message={error.message} />
      ) : !media ? (
        <LoadingState />
      ) : media.length === 0 ? (
        <p className="panel py-12 text-center text-sm text-neutral-400">No files yet</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {media.map((item, index) => (
            <MediaCard key={item.id} item={item} index={index} />
          ))}
        </ul>
      )}
    </>
  );
}
