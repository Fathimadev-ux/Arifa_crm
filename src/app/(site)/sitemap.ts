import type { MetadataRoute } from "next";
import { cms } from "@/lib/cms";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arifapack.com";
const published = { _status: { equals: "published" } } as const;

/** Every published page (unless "include in sitemap" is off or it is hidden from search), category and product. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await cms();
  const [pages, categories, products] = await Promise.all([
    payload.find({ collection: "pages", where: published, limit: 500, depth: 0 }),
    payload.find({ collection: "product-categories", where: published, limit: 500, depth: 0 }),
    payload.find({ collection: "products", where: published, limit: 2000, depth: 0 }),
  ]);
  const listed = <Doc extends { seo?: { includeInSitemap?: boolean | null; hideFromSearch?: boolean | null } | null }>(docs: Doc[]) =>
    docs.filter((doc) => doc.seo?.includeInSitemap !== false && !doc.seo?.hideFromSearch);

  return [
    ...listed(pages.docs).map((page) => ({ url: `${SITE_URL}${page.slug === "home" ? "" : `/${page.slug}`}`, lastModified: page.updatedAt })),
    ...listed(categories.docs).map((category) => ({ url: `${SITE_URL}/categories/${category.slug}`, lastModified: category.updatedAt })),
    ...listed(products.docs).map((product) => ({ url: `${SITE_URL}/products/${product.slug}`, lastModified: product.updatedAt })),
    { url: `${SITE_URL}/faq` },
    { url: `${SITE_URL}/quality` },
  ];
}
