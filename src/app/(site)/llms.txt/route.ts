import { cms, getSettings } from "@/lib/cms";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arifapack.com";
const published = { _status: { equals: "published" } } as const;

/** GEO: a plain summary of the company and its catalogue for AI assistants (llms.txt). Never prices. */
export async function GET() {
  const payload = await cms();
  const [settings, pages, categories, products] = await Promise.all([
    getSettings(),
    payload.find({ collection: "pages", where: published, limit: 200, depth: 0 }),
    payload.find({ collection: "product-categories", where: published, limit: 200, depth: 0, sort: "order" }),
    payload.find({ collection: "products", where: published, limit: 1000, depth: 0, sort: "title" }),
  ]);

  const lines = [
    `# ${settings.divisionName || settings.brandName}`,
    "",
    `> ${settings.metaDescription ?? ""}`,
    "",
    ...(settings.companyFacts ?? []).map((fact) => `- ${fact.label}: ${fact.value}`),
    settings.headOfficeAddress ? `- Address: ${settings.headOfficeAddress}` : "",
    settings.divisionEmail ? `- Email: ${settings.divisionEmail}` : "",
    "",
    "## Pages",
    ...pages.docs.filter((page) => !page.seo?.hideFromSearch).map((page) => `- [${page.title}](${SITE_URL}${page.slug === "home" ? "/" : `/${page.slug}`})${page.summary ? `: ${page.summary}` : ""}`),
    "",
    "## Product ranges",
    ...categories.docs.map((category) => `- [${category.title}](${SITE_URL}/categories/${category.slug})${category.description ? `: ${category.description}` : ""}`),
    ...(products.docs.length > 0 ? ["", "## Products", ...products.docs.map((product) => `- [${product.title}](${SITE_URL}/products/${product.slug}) (${product.code})${product.summary || product.shortDescription ? `: ${product.summary || product.shortDescription}` : ""}`)] : []),
  ];

  return new Response(lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
