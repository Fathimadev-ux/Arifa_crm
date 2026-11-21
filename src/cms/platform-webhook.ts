/**
 * CMS.md §2: on every publish and unpublish, tell the platform (AI knowledge + CRM product mirror). The body is
 * signed with HMAC-SHA256 over "<timestamp>.<raw body>"; retries reuse the same event_id so it is handled once.
 */
import { createHmac, randomUUID } from "node:crypto";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload, PayloadRequest } from "payload";

type Operation = "publish" | "unpublish";
type Doc = Record<string, unknown> & { id: string | number; _status?: string; slug?: string };

/** Waits before each try; the first goes straight away. */
const RETRY_DELAYS_MS = [0, 5_000, 30_000, 120_000];

/** The public path of a document, where the website shows it. */
function publicPath(collection: string, doc: Doc): string | undefined {
  if (!doc.slug) return undefined;
  if (collection === "pages") return doc.slug === "home" ? "/" : `/${doc.slug}`;
  if (collection === "products") return `/products/${doc.slug}`;
  if (collection === "product-categories") return `/categories/${doc.slug}`;
  return undefined;
}

/** §2 `product`: what the CRM mirrors. Never prices, tiers, MOQ for quoting or delivery time. */
async function productPayload(doc: Doc, req: PayloadRequest) {
  const categoryId = typeof doc.category === "object" && doc.category !== null ? (doc.category as Doc).id : doc.category;
  const category = categoryId ? ((await req.payload.findByID({ collection: "product-categories", id: categoryId as string, depth: 0, req }).catch(() => null)) as Doc | null) : null;
  const spec = Object.fromEntries(Object.entries((doc.specs ?? {}) as Record<string, unknown>).filter(([key, value]) => key !== "id" && value !== null && value !== undefined && value !== ""));
  return {
    code: String(doc.code),
    name: String(doc.title),
    category_code: (category?.code as string | undefined) ?? undefined,
    category_name: (category?.title as string | undefined) ?? undefined,
    spec,
    custom_printing: Boolean(doc.customPrinting),
  };
}

async function send(payload: Payload, body: Record<string, unknown>) {
  const url = process.env.KX_API_HOOK_URL;
  const secret = process.env.KX_CMS_WEBHOOK_HMAC;
  if (!url || !secret) {
    payload.logger.info(`Platform webhook not configured: ${body.operation} ${body.collection}/${body.doc_id} not sent`);
    return;
  }
  const raw = JSON.stringify(body);
  for (const [attempt, delay] of RETRY_DELAYS_MS.entries()) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    // Signed with the time of this attempt: the platform refuses timestamps more than 5 minutes off.
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Kx-Timestamp": timestamp, "X-Kx-Signature": `sha256=${signature}` },
        body: raw,
      });
      if (response.ok) return;
      // A 422 means the body itself is wrong: sending it again won't help.
      if (response.status === 422) {
        payload.logger.error(`Platform refused ${body.collection}/${body.doc_id}: ${await response.text()}`);
        return;
      }
      payload.logger.warn(`Platform webhook ${response.status} (try ${attempt + 1})`);
    } catch (error) {
      payload.logger.warn(`Platform webhook failed (try ${attempt + 1}): ${String(error)}`);
    }
  }
  payload.logger.error(`Platform webhook gave up: ${body.operation} ${body.collection}/${body.doc_id} (event ${body.event_id})`);
}

async function notify(operation: Operation, collection: string, doc: Doc, req: PayloadRequest) {
  const body: Record<string, unknown> = { event_id: randomUUID(), operation, collection, doc_id: String(doc.id), locales: ["en"], url: publicPath(collection, doc) };
  if (collection === "products") body.product = await productPayload(doc, req);
  // Sent in the background, so saving in the admin never waits for the platform.
  void send(req.payload, body);
}

/**
 * Publish, or unpublish. A draft save leaves the published record in place (only a new version is written), so
 * an unpublish is: the record itself is now a draft, and it had been published before.
 */
export const notifyPlatformOnChange: CollectionAfterChangeHook = async ({ doc, operation, collection, req }) => {
  if (req.context.seeding) return doc;
  if (doc._status === "published") {
    await notify("publish", collection.slug, doc, req);
    return doc;
  }
  // The admin's "Save draft" (and REST draft saves) say so in the query; only an unpublish writes the record.
  if (operation !== "update" || String(req.query?.draft) === "true") return doc;
  const current = (await req.payload.findByID({ collection: collection.slug, id: doc.id, depth: 0, draft: false, req }).catch(() => null)) as Doc | null;
  if (current?._status === "published") return doc;
  const { totalDocs: publishedVersions } = await req.payload.findVersions({ collection: collection.slug, where: { and: [{ parent: { equals: doc.id } }, { "version._status": { equals: "published" } }] }, limit: 1, depth: 0, req });
  if (publishedVersions > 0) await notify("unpublish", collection.slug, doc, req);
  return doc;
};

export const notifyPlatformOnDelete: CollectionAfterDeleteHook = async ({ doc, collection, req }) => {
  if (doc._status === "published") await notify("unpublish", collection.slug, doc, req);
  return doc;
};
