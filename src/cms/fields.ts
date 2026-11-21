import type { Field } from "payload";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The URL path, made from the title when left empty (editable: CMS.md "URL slug"). */
export const slugField = (from = "title"): Field => ({
  name: "slug",
  type: "text",
  unique: true,
  index: true,
  admin: { position: "sidebar", description: "The page address. Filled from the title when left empty." },
  hooks: {
    beforeValidate: [({ value, data }) => (value ? slugify(String(value)) : data?.[from] ? slugify(String(data[from])) : value)],
  },
});

/** CMS.md §3: the text the AI learns from, filled on save (see plain-text.ts). Never edited by hand. */
export const plainTextField: Field = {
  name: "plainText",
  type: "textarea",
  // Filled on save and read by the platform; editors never need to see or change it.
  admin: { hidden: true },
};

/** The display order on the website (lower first). */
export const orderField: Field = { name: "order", type: "number", defaultValue: 0, admin: { position: "sidebar" } };

/** SEO: title, description, share image, canonical link, sitemap and search visibility (CMS.md §1). */
export const seoFields: Field = {
  name: "seo",
  type: "group",
  label: "SEO",
  fields: [
    { name: "metaTitle", type: "text", label: "Page title" },
    { name: "metaDescription", type: "textarea", label: "Meta description", maxLength: 300 },
    { name: "shareImage", type: "upload", relationTo: "media" },
    { name: "canonicalUrl", type: "text", label: "Canonical link" },
    { name: "includeInSitemap", type: "checkbox", defaultValue: true },
    { name: "hideFromSearch", type: "checkbox", defaultValue: false },
  ],
};

/**
 * AEO / GEO: short direct answers (published as FAQ structured data), "how to order" steps, a key-facts box and
 * a citation-friendly summary.
 */
export const answerFields: Field[] = [
  { name: "summary", type: "textarea", admin: { description: "Two or three plain sentences an AI assistant can quote." } },
  {
    name: "faqs",
    type: "array",
    label: "FAQs",
    fields: [
      { name: "question", type: "text", required: true },
      { name: "answer", type: "textarea", required: true },
    ],
  },
  {
    name: "keyFacts",
    type: "array",
    fields: [
      { name: "label", type: "text", required: true },
      { name: "value", type: "text", required: true },
    ],
  },
  { name: "howToOrder", type: "array", label: "How to order", fields: [{ name: "step", type: "text", required: true }] },
];
