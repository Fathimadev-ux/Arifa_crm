/**
 * The website's reads from Payload (server only, through the Local API). Visitors get published content;
 * an editor's preview (draft mode) gets the latest drafts.
 */
import config from "@payload-config";
import { draftMode } from "next/headers";
import { getPayload, type Where } from "payload";
import type { Media, Page, Product, ProductCategory, SiteSetting } from "@/payload-types";
import type { Product as ProductCard } from "@/lib/website-types";

export type PageBlock = NonNullable<Page["layout"]>[number];
export type Settings = SiteSetting;

export const cms = () => getPayload({ config });

/** Draft content only inside an editor's preview. */
export async function isPreview() {
  return (await draftMode()).isEnabled;
}

/** The address of an uploaded file ("" when there is none). */
export const mediaUrl = (media: number | Media | null | undefined) => (media && typeof media === "object" ? (media.url ?? "") : "");

const publishedWhere = (draft: boolean, where: Where = {}): Where => (draft ? where : { and: [where, { _status: { equals: "published" } }] });

export async function getSettings(): Promise<Settings> {
  return (await cms()).findGlobal({ slug: "site-settings", depth: 1 });
}

export async function getPage(slug: string): Promise<Page | null> {
  const draft = await isPreview();
  const result = await (await cms()).find({ collection: "pages", where: publishedWhere(draft, { slug: { equals: slug } }), draft, depth: 2, limit: 1 });
  return result.docs[0] ?? null;
}

export async function getCategories(): Promise<ProductCategory[]> {
  const draft = await isPreview();
  return (await (await cms()).find({ collection: "product-categories", where: publishedWhere(draft), draft, depth: 1, sort: "order", limit: 100 })).docs;
}

export async function getCategory(slug: string): Promise<{ category: ProductCategory; products: Product[] } | null> {
  const draft = await isPreview();
  const payload = await cms();
  const category = (await payload.find({ collection: "product-categories", where: publishedWhere(draft, { slug: { equals: slug } }), draft, depth: 1, limit: 1 })).docs[0];
  if (!category) return null;
  const products = (await payload.find({ collection: "products", where: publishedWhere(draft, { category: { equals: category.id } }), draft, depth: 1, limit: 200, sort: "title" })).docs;
  return { category, products };
}

export async function getProduct(slug: string): Promise<Product | null> {
  const draft = await isPreview();
  return (await (await cms()).find({ collection: "products", where: publishedWhere(draft, { slug: { equals: slug } }), draft, depth: 2, limit: 1 })).docs[0] ?? null;
}

export async function getPublished<Slug extends "faqs" | "certificates" | "testimonials" | "client-logos">(collection: Slug) {
  const draft = await isPreview();
  return (await (await cms()).find({ collection, where: publishedWhere(draft), draft, depth: 1, sort: "order", limit: 200 })).docs;
}

/** Home page cards: one per product category, linking to its page. */
export const toProductCards = (categories: ProductCategory[]): ProductCard[] =>
  categories.map((category) => ({
    id: String(category.id),
    isVisible: true,
    name: category.title,
    rating: category.rating ?? 5,
    description: category.description ?? "",
    image: mediaUrl(category.heroImage),
    href: `/categories/${category.slug}`,
  }));

/** Page metadata from a document's SEO fields, falling back to the site defaults. */
export function seoMetadata(seo: Page["seo"] | undefined, fallbackTitle: string, settings: Settings) {
  return {
    title: seo?.metaTitle || fallbackTitle || settings.pageTitle || settings.brandName,
    description: seo?.metaDescription || settings.metaDescription || undefined,
    alternates: seo?.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    robots: seo?.hideFromSearch ? { index: false, follow: false } : undefined,
    openGraph: { images: mediaUrl(seo?.shareImage) || mediaUrl(settings.shareImage) || undefined },
  };
}
