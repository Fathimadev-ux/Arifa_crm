"use client";

/**
 * The editor side of kx.cms (CMS_API.md): content types and their JSON Schemas, documents with a draft and a
 * live version, publish / unpublish, versions and restore, preview, and the media library.
 */
import { showToast } from "@/components/Toaster";
import { ApiError, api, unwrap, type Schemas } from "./client";
import { revalidate, useApi } from "./use-api";

export type CollectionInfo = Schemas["CollectionInfo"];
export type DocumentSummary = Schemas["DocumentSummary"];
export type DocumentOut = Schemas["DocumentOut"];
export type Version = Schemas["VersionOut"];
export type VersionSummary = Schemas["VersionSummary"];
export type MediaItem = Schemas["MediaOut"];
/** Content per language: {"en": {...}, "ar": {...}}. English is complete; Arabic holds what is translated. */
export type LocalizedData = { en?: Record<string, unknown>; ar?: Record<string, unknown> };

const COLLECTIONS = "cms:collections";
const docsKey = (collection: string) => `cms:docs:${collection}`;
const docKey = (collection: string, key: string) => `cms:doc:${collection}:${key}`;
const MEDIA = "cms:media";

const docPath = (collection: string, key: string) => ({ params: { path: { collection, key } } });

/** Runs a change, toasts the outcome and reloads the affected reads; refusals show the backend's message. */
export async function runAction<T>(call: () => Promise<T>, success: string, refresh: string[]): Promise<T | undefined> {
  try {
    const result = await call();
    showToast(success);
    revalidate(...refresh);
    return result;
  } catch (error) {
    showToast(messageOf(error));
    if (error instanceof ApiError && error.status === 409) revalidate(...refresh);
    return undefined;
  }
}

/** The backend's reasons (CMS_API.md §7) in plain words; anything else keeps its own message. */
function messageOf(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something went wrong";
  if (error.status === 409) return "A colleague saved this meanwhile: it was reloaded, please make your change again";
  const reasons: Record<string, string> = {
    cms_price: "No prices in content: prices only appear in the CRM's approved quotes",
    cms_family: "Publish the product's family first",
    cms_no_draft: "There is no draft to publish",
    cms_media_type: "This file type isn't allowed here",
    cms_media_size: "This file is too large",
  };
  return (error.reason && reasons[error.reason]) || error.message;
}

// ---------- Reads ----------

export const useCollections = () => useApi(COLLECTIONS, async () => unwrap(await api.GET("/v1/cms/collections")));
export const useDocuments = (collection: string | null) =>
  useApi(collection ? docsKey(collection) : null, async () => unwrap(await api.GET("/v1/cms/collections/{collection}", { params: { path: { collection: collection! } } })));
export const useDocument = (collection: string, key: string | null) =>
  useApi(key ? docKey(collection, key) : null, async () => unwrap(await api.GET("/v1/cms/collections/{collection}/{key}", docPath(collection, key!))));
export const useVersions = (collection: string, key: string | null) =>
  useApi(key ? `${docKey(collection, key)}:versions` : null, async () => unwrap(await api.GET("/v1/cms/collections/{collection}/{key}/versions", docPath(collection, key!))));
export const useMedia = (kind?: "image" | "video" | "application") => useApi(`${MEDIA}:${kind ?? "all"}`, async () => unwrap(await api.GET("/v1/cms/media", { params: { query: { kind } } })));

const afterChange = (collection: string, key: string) => [docsKey(collection), docKey(collection, key)];

// ---------- Draft, publish, versions ----------

/** Send the revision you loaded (null for a new document): a colleague's newer save answers 409 and nothing is lost. */
export function saveDraft(collection: string, key: string, data: LocalizedData, revision: number | null, sortOrder?: number) {
  return runAction(
    async () => unwrap(await api.PUT("/v1/cms/collections/{collection}/{key}", { ...docPath(collection, key), body: { data, revision, sort_order: sortOrder ?? null } })),
    "Draft saved",
    afterChange(collection, key),
  );
}

/** Live on the website within about a minute; the AI's knowledge and the CRM product record follow. */
export function publishDocument(collection: string, key: string, note: string) {
  return runAction(
    async () => unwrap(await api.POST("/v1/cms/collections/{collection}/{key}/publish", { ...docPath(collection, key), body: { note: note.trim() || null } })),
    "Published: the website updates within about a minute",
    afterChange(collection, key),
  );
}

export function unpublishDocument(collection: string, key: string) {
  return runAction(
    async () => {
      unwrap(await api.POST("/v1/cms/collections/{collection}/{key}/unpublish", docPath(collection, key)));
      return true;
    },
    "Taken off the website",
    afterChange(collection, key),
  );
}

/** A document that was never published disappears with its draft. */
export function discardDraft(collection: string, key: string) {
  return runAction(
    async () => {
      unwrap(await api.DELETE("/v1/cms/collections/{collection}/{key}/draft", docPath(collection, key)));
      return true;
    },
    "Draft discarded",
    afterChange(collection, key),
  );
}

/** Copies an earlier version into the draft; publish it to go live again. */
export function restoreVersion(collection: string, key: string, number: number) {
  return runAction(
    async () => unwrap(await api.POST("/v1/cms/collections/{collection}/{key}/versions/{number}/restore", { params: { path: { collection, key, number } } })),
    `Version ${number} copied into the draft: publish it to go live`,
    [...afterChange(collection, key), `${docKey(collection, key)}:versions`],
  );
}

/** A 30-minute token; `url` opens the website in draft mode (null until the website address is set on the backend). */
export function startPreview() {
  return runAction(async () => unwrap(await api.POST("/v1/cms/preview-token")), "Preview ready", []);
}

// ---------- Media (straight from the browser to storage) ----------

const MAX_BYTES: Record<string, number> = { image: 15, video: 300, application: 30, model: 50 };
export const MEDIA_ACCEPT = "image/*,video/*,application/pdf,model/gltf-binary,.glb";

const kindOf = (type: string) => (type.startsWith("model/") || type === "" ? "model" : type.split("/")[0]);

async function sha256Of(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function imageSizeOf(file: File): Promise<{ width: number | null; height: number | null }> {
  if (!file.type.startsWith("image/")) return Promise.resolve({ width: null, height: null });
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => (resolve({ width: image.naturalWidth, height: image.naturalHeight }), URL.revokeObjectURL(image.src));
    image.onerror = () => resolve({ width: null, height: null });
    image.src = URL.createObjectURL(file);
  });
}

/** Start the upload (name, type, size, SHA-256), PUT the file to the returned address, then confirm it. */
export function uploadMedia(file: File, altEn: string) {
  const limitMb = MAX_BYTES[kindOf(file.type)] ?? 15;
  if (file.size > limitMb * 1024 * 1024) {
    showToast(`This file is too large: up to ${limitMb} MB`);
    return Promise.resolve(undefined);
  }
  return runAction(
    async () => {
      const contentType = file.type || "model/gltf-binary";
      const started = unwrap(await api.POST("/v1/cms/media/uploads", { body: { filename: file.name, content_type: contentType, size: file.size, sha256: await sha256Of(file), alt: altEn.trim() ? { en: altEn.trim() } : {} } }));
      if (!started.already_uploaded && started.upload_url) {
        const stored = await fetch(started.upload_url, { method: "PUT", headers: started.headers, body: file });
        if (!stored.ok) throw new ApiError(stored.status, "The file couldn't be stored: try again");
      }
      return unwrap(await api.POST("/v1/cms/media/{asset_id}/confirm", { params: { path: { asset_id: started.asset_id } }, body: await imageSizeOf(file) }));
    },
    `${file.name} uploaded`,
    [MEDIA],
  );
}

/** Alt text per language: what the image shows, for screen readers and search. */
export function saveAlt(item: MediaItem, alt: Record<string, string>) {
  return runAction(async () => unwrap(await api.PATCH("/v1/cms/media/{asset_id}", { params: { path: { asset_id: item.id } }, body: { alt } })), "Alt text saved", [MEDIA]);
}
