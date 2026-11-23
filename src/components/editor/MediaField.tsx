"use client";

import { FileText, Link2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { MEDIA_ACCEPT, type MediaItem, uploadMedia, useMedia } from "@/lib/api/cms";
import { INPUT } from "@/components/forms";

const isVideo = (item: MediaItem) => item.content_type.startsWith("video/");

/** A small preview: the image itself, a video's first frame, or a file icon for a PDF or 3D model. */
export function MediaThumb({ item, size = "size-16" }: { item: MediaItem; size?: string }) {
  if (isVideo(item)) return <video src={item.src} muted playsInline preload="metadata" className={`${size} shrink-0 rounded-2xl bg-black object-cover`} />;
  return item.content_type.startsWith("image/") ? (
    // Library files live on content-addressed storage URLs; next/image needs their host configured, so a plain img here.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.src} alt={item.alt.en ?? ""} className={`${size} shrink-0 rounded-2xl bg-white object-contain ring-1 ring-black/5`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-2xl bg-black/5 text-neutral-500`}>
      <FileText className="size-5" />
    </span>
  );
}

/** A video with play controls, so a saved video can be watched (nothing for other files). */
export function VideoPlayer({ item }: { item: MediaItem }) {
  if (!isVideo(item)) return null;
  return <video src={item.src} controls playsInline preload="metadata" aria-label={item.alt.en ?? item.filename} className="aspect-video w-full rounded-2xl bg-black" />;
}

/** The library as a grid to pick from, with an upload button. */
function Picker({ onPick, onClose }: { onPick: (item: MediaItem) => void; onClose: () => void }) {
  const { data: media } = useMedia();
  const fileInput = useRef<HTMLInputElement>(null);
  const upload = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    const item = await uploadMedia(file, "");
    if (item) onPick(item);
  };
  return (
    <div className="animate-enter mt-2 space-y-3 rounded-3xl bg-white p-4 shadow-lg ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Choose a file</p>
        <div className="flex gap-1">
          <input ref={fileInput} type="file" accept={MEDIA_ACCEPT} hidden onChange={(event) => void upload(event.target.files?.[0])} />
          <button type="button" onClick={() => fileInput.current?.click()} className="press flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium hover:bg-black/5">
            <Upload className="size-3.5" /> Upload new
          </button>
          <button type="button" onClick={onClose} aria-label="Close" className="press grid size-8 place-items-center rounded-full hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>
      </div>
      {!media && <div className="h-24 animate-pulse rounded-2xl bg-neutral-100" />}
      <ul className="grid max-h-72 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
        {media?.map((item) => (
          <li key={item.id}>
            <button type="button" onClick={() => onPick(item)} title={item.filename} className="press flex w-full flex-col items-center gap-1 rounded-2xl p-2 hover:bg-black/5">
              <MediaThumb item={item} size="size-20" />
              <span className="w-full truncate text-center text-[11px] text-neutral-500">{item.filename}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A MediaRef field: {asset_id} from the library, or {url} for an outside link such as a YouTube film. */
export function MediaField({ title, value, onChange }: { title: string; value: Record<string, string> | null | undefined; onChange: (value: Record<string, string> | undefined) => void }) {
  const { data: media } = useMedia();
  const [mode, setMode] = useState<"IDLE" | "PICK" | "LINK">("IDLE");
  const [link, setLink] = useState(value?.url ?? "");
  const chosen = value?.asset_id ? media?.find((item) => item.id === value.asset_id) : undefined;

  return (
    <div>
      <span className="mb-1.5 block px-1 text-xs text-neutral-500">{title}</span>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-dashed border-neutral-300 p-3">
        {chosen && <MediaThumb item={chosen} />}
        <span className="min-w-0 flex-1 truncate text-sm">
          {chosen ? chosen.filename : value?.asset_id ? `File ${value.asset_id}` : value?.url ? value.url : <span className="text-neutral-400">Nothing chosen</span>}
        </span>
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={() => setMode(mode === "PICK" ? "IDLE" : "PICK")} className="press h-8 rounded-full px-3 text-xs font-medium hover:bg-black/5">
            {value?.asset_id ? "Change" : "Choose file"}
          </button>
          <button type="button" onClick={() => setMode(mode === "LINK" ? "IDLE" : "LINK")} className="press flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium hover:bg-black/5">
            <Link2 className="size-3.5" /> Link
          </button>
          {(value?.asset_id || value?.url) && (
            <button type="button" onClick={() => (onChange(undefined), setLink(""))} aria-label="Remove" className="press grid size-8 place-items-center rounded-full hover:bg-black/5">
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>
      {chosen && <div className="mt-2 max-w-md"><VideoPlayer item={chosen} /></div>}
      {mode === "PICK" && <Picker onPick={(item) => (onChange({ asset_id: item.id }), setMode("IDLE"))} onClose={() => setMode("IDLE")} />}
      {mode === "LINK" && (
        <div className="animate-enter mt-2 flex gap-2">
          <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={INPUT} />
          <button type="button" disabled={!/^https:\/\/\S+$/.test(link)} onClick={() => (onChange({ url: link.trim() }), setMode("IDLE"))} className="press h-10 shrink-0 rounded-full bg-black px-4 text-sm font-medium text-white disabled:bg-neutral-300">
            Use link
          </button>
        </div>
      )}
    </div>
  );
}
