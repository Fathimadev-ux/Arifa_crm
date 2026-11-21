/**
 * Sample kx.cms for sample mode: documents with a draft and a live version, revisions (409 on a stale save), the
 * price rule (422 cms_price), publish / unpublish, versions and restore, preview tokens and the media library.
 * The texts are placeholders to replace in the CMS; nothing here is real Arifa content.
 */
import type { Schemas } from "@/lib/api/client";
import { SAMPLE_COLLECTIONS } from "./demo-schemas";

type Version = Schemas["VersionOut"];
type Data = { en?: Record<string, unknown>; ar?: Record<string, unknown> };
interface Doc {
  collection: string;
  key: string;
  sort_order: number;
  updated_at: string;
  draft: Version | null;
  published: Version | null;
  history: Version[];
}
export type Body = Record<string, unknown>;
export type Handler = (params: string[], body: Body, query: URLSearchParams, author: string) => Response;

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
export const problem = (status: number, detail: string, extra: Body = {}) => json({ type: "about:blank", title: detail, status, detail, ...extra }, status);
const now = () => new Date().toISOString();
const SAMPLE = "Sample text: replace it in the CMS.";

const version = (number: number, data: Data, status: Version["status"], author: string, publishedAt: string | null = null): Version => ({
  number, status, revision: 1, data, author, saved_at: now(), published_at: publishedAt, published_by: publishedAt ? author : null, note: null,
});

function seed(collection: string, key: string, en: Record<string, unknown>, ar: Record<string, unknown> = {}, state: "published" | "draft" | "changed" = "published"): Doc {
  const live = version(1, { en, ar }, "published", "Sample", now());
  // "changed": live, with an open draft that isn't published yet.
  const draft = state === "published" ? null : version(state === "draft" ? 1 : 2, structuredClone({ en, ar }), "draft", "Sample");
  return { collection, key, sort_order: 0, updated_at: now(), draft, published: state === "draft" ? null : live, history: state === "draft" ? [] : [live] };
}

const docs: Doc[] = [
  seed("site", "site", { company_name: "Arifa Pack", phones: ["+971 00 000 0000"], emails: ["info@example.com"], hours: "Sample hours", announcement: "", product_pages: false, assistant: { greeting: SAMPLE } }),
  seed("pages", "home", { title: "Home", path: "/", seo: { title: "Home", description: SAMPLE }, blocks: [{ section_id: "top", design_id: "HM-01", heading: "Sample heading", body: SAMPLE }, { section_id: "factory", design_id: "HM-03", heading: "Sample heading", items: [{ title: "Caption 1" }, { title: "Caption 2" }] }] }, { title: "الرئيسية" }),
  seed("pages", "about", { title: "About", path: "/about", blocks: [{ section_id: "story", design_id: "AB-02", heading: "Sample heading", body: SAMPLE }] }, {}, "changed"),
  seed("pages", "contact", { title: "Contact", path: "/contact", blocks: [{ section_id: "enquiry", design_id: "CT-01", heading: "Sample heading" }] }),
  ...["containers", "foil", "platters", "cups-trays", "pots", "microwave", "cutlery", "cling-film"].map((key, index) =>
    Object.assign(seed("families", key, { name: key.replace("-", " & ").replace(/^\w/, (letter) => letter.toUpperCase()), blurb: SAMPLE, synonyms: [] }), { sort_order: index }),
  ),
  seed("products", "ac-8325", { family: "containers", ref: "8325", code: "AC-1", name: "Sample container 8325", qty: "Sample packing", range: "trade", short_description: SAMPLE, oven: true, freezer: true, applications: [], photos: [{ asset_id: "media-1" }] }),
  seed("products", "foil-45-blue", { family: "foil", ref: "45", name: "Sample foil roll 45 cm", range: "self", short_description: SAMPLE }, {}, "draft"),
  seed("tour_chapters", "arrival", { title: "Arrival", seconds: 0, family: "containers" }),
  seed("stations", "material-in", { title: "Material in", text: SAMPLE }),
  seed("faqs", "minimum-order", { question: "Sample question?", answer: SAMPLE }),
  seed("certificates", "sample-certificate", { title: "Sample certificate", issuer: "Sample issuer" }),
  seed("clients", "sample-client", { name: "Sample client", sample: true }),
  seed("industries", "sample-trade", { name: "Sample trade", use: SAMPLE, product_kit: ["ac-8325"], sample: true }),
  seed("stories", "sample-story", { title: "Sample story", quote: SAMPLE, client: "Sample client", sample: true }),
  seed("leadership", "sample-director", { name: "Sample name", role: "Director", message: SAMPLE }),
];

const media: Schemas["MediaOut"][] = [
  ["media-1", "/images/products/aluminium-container-250-250.png", "aluminium-container.png", 250, 250],
  ["media-2", "/images/products/aluminium-foil-250-250.png", "aluminium-foil.png", 250, 250],
  ["media-3", "/images/hero/innovating.png", "hero.png", 1200, 600],
].map(([id, src, filename, width, height]) => ({ id: String(id), src: String(src), filename: String(filename), content_type: "image/png", size_bytes: 110_000, width: Number(width), height: Number(height), alt: { en: "Sample image" }, created_at: now() }));

// ---------- Rules ----------

/** CMS_API.md §1: an amount of money in content is refused (percentages are fine). */
const PRICE = /(\b(AED|USD|SAR|INR|dirhams?|dhs?)\s?\d|\d[\d.,]*\s?(AED|USD|SAR|INR|dirhams?|dhs?)\b|[$€£₹]\s?\d)/i;
const hasPrice = (value: unknown): boolean =>
  typeof value === "string" ? PRICE.test(value) : Array.isArray(value) ? value.some(hasPrice) : value && typeof value === "object" ? Object.values(value).some(hasPrice) : false;

const titleOf = (doc: Doc) => {
  const en = ((doc.draft ?? doc.published)?.data.en ?? {}) as Body;
  return String(en.title ?? en.name ?? en.question ?? en.company_name ?? doc.key);
};
const statusOf = (doc: Doc) => (doc.draft && doc.published ? "changed" : doc.draft ? "draft" : "published");
const find = (collection: string, key: string) => docs.find((doc) => doc.collection === collection && doc.key === decodeURIComponent(key));
const docOut = (doc: Doc) => ({ collection: doc.collection, key: doc.key, sort_order: doc.sort_order, updated_at: doc.updated_at, draft: doc.draft, published: doc.published });
/** A version without its content (VersionSummary). */
const summary = (version: Version) => ({ number: version.number, status: version.status, author: version.author, saved_at: version.saved_at, published_at: version.published_at, published_by: version.published_by, note: version.note });

function withDoc(handle: (doc: Doc, body: Body, number: number) => Response): Handler {
  return ([collection, key, number], body) => {
    const doc = find(collection, key);
    return doc ? handle(doc, body, Number(number)) : problem(404, "This document doesn't exist or isn't published");
  };
}

function saveDraft([collection, key]: string[], body: Body, author: string) {
  if (!SAMPLE_COLLECTIONS.some((item) => item.name === collection)) return problem(404, "Unknown content type");
  if (hasPrice(body.data)) return problem(422, "Prices can't be in content", { reason: "cms_price" });
  let doc = find(collection, key);
  if (!doc) {
    doc = { collection, key: decodeURIComponent(key), sort_order: docs.filter((item) => item.collection === collection).length, updated_at: now(), draft: null, published: null, history: [] };
    docs.push(doc);
  }
  if (doc.draft && body.revision !== doc.draft.revision) return problem(409, "A colleague saved this draft meanwhile");
  const number = doc.draft?.number ?? doc.history.length + 1;
  doc.draft = { ...version(number, body.data as Data, "draft", author), revision: (doc.draft?.revision ?? 0) + 1 };
  if (typeof body.sort_order === "number") doc.sort_order = body.sort_order;
  doc.updated_at = now();
  return json(doc.draft);
}

export const CONTENT_ROUTES: [string, RegExp, Handler][] = [
  ["GET", /^\/v1\/cms\/collections$/, () => json(SAMPLE_COLLECTIONS)],
  ["GET", /^\/v1\/cms\/collections\/([^/]+)$/, ([collection]) =>
    json(docs.filter((doc) => doc.collection === collection).sort((a, b) => a.sort_order - b.sort_order).map((doc) => ({ key: doc.key, title: titleOf(doc), sort_order: doc.sort_order, updated_at: doc.updated_at, status: statusOf(doc), published_version: doc.published?.number ?? null, draft_revision: doc.draft?.revision ?? null })))],
  ["GET", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)$/, withDoc((doc) => json(docOut(doc)))],
  ["PUT", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)$/, (params, body, _, author) => saveDraft(params, body, author)],
  ["POST", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)\/publish$/, (params, body, __, author) =>
    withDoc((doc) => {
      if (!doc.draft) return problem(422, "There is no draft to publish", { reason: "cms_no_draft" });
      const live: Version = { ...doc.draft, status: "published", published_at: now(), published_by: author, note: (body.note as string) ?? null };
      // The version that was live before is kept, as archived.
      doc.history.forEach((item) => item.status === "published" && (item.status = "archived"));
      Object.assign(doc, { published: live, draft: null, updated_at: now() });
      doc.history.unshift(live);
      return json(live);
    })(params, body, new URLSearchParams(), author)],
  ["POST", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)\/unpublish$/, withDoc((doc) => {
    if (doc.published) doc.published.status = "archived";
    Object.assign(doc, { published: null, updated_at: now() });
    return new Response(null, { status: 204 });
  })],
  ["DELETE", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)\/draft$/, withDoc((doc) => {
    doc.draft = null;
    if (!doc.published && doc.history.length === 0) docs.splice(docs.indexOf(doc), 1);
    return new Response(null, { status: 204 });
  })],
  ["GET", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)\/versions$/, withDoc((doc) => json([...(doc.draft ? [doc.draft] : []), ...doc.history].map(summary)))],
  ["POST", /^\/v1\/cms\/collections\/([^/]+)\/([^/]+)\/versions\/(\d+)\/restore$/, withDoc((doc, _, number) => {
    const old = doc.history.find((item) => item.number === number);
    if (!old) return problem(404, "Version not found");
    doc.draft = { ...version(doc.history.length + 1, structuredClone(old.data) as Data, "draft", "You"), revision: (doc.draft?.revision ?? 0) + 1, note: `Restored from version ${number}` };
    return json(doc.draft);
  })],
  // The website address isn't set in sample mode, so the preview has no link to open.
  ["POST", /^\/v1\/cms\/preview-token$/, () => json({ token: crypto.randomUUID(), expires_at: new Date(Date.now() + 30 * 60_000).toISOString(), url: null })],
  ["GET", /^\/v1\/cms\/media$/, (_, __, query) => json(media.filter((item) => !query.get("kind") || item.content_type.startsWith(query.get("kind")!)))],
  ["POST", /^\/v1\/cms\/media\/uploads$/, (_, body) => {
    const id = `media-${media.length + 1}`;
    media.unshift({ id, src: "/images/logo/logo-600-600.png", filename: String(body.filename), content_type: String(body.content_type), size_bytes: Number(body.size), width: null, height: null, alt: (body.alt as Record<string, string>) ?? {}, created_at: now() });
    // Sample mode stores no file: nothing to PUT.
    return json({ asset_id: id, object_key: `sample/${id}`, upload_url: null, headers: {}, already_uploaded: true });
  }],
  ["POST", /^\/v1\/cms\/media\/([^/]+)\/confirm$/, ([id], body) => {
    const item = media.find((entry) => entry.id === id);
    return item ? json(Object.assign(item, { width: body.width ?? null, height: body.height ?? null })) : problem(404, "Media not found");
  }],
  ["PATCH", /^\/v1\/cms\/media\/([^/]+)$/, ([id], body) => {
    const item = media.find((entry) => entry.id === id);
    return item ? json(Object.assign(item, { alt: body.alt })) : problem(404, "Media not found");
  }],
];
