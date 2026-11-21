import { isStaff, publishedOrStaff } from "@/cms/access";
import { answerFields, orderField, plainTextField, seoFields, slugField } from "@/cms/fields";
import { publishedContent } from "@/cms/hooks";
import { previewAt } from "@/cms/preview";

/**
 * CMS.md §1 catalogue. No prices anywhere (no price, cost, discount or tier fields): prices, tiers, MOQ for
 * quoting and delivery time live only in the CRM, which matches products by their code.
 */

export const ProductCategories = publishedContent({
  slug: "product-categories",
  labels: { singular: "Product category", plural: "Product categories" },
  admin: {
    useAsTitle: "title",
    group: "Content",
    defaultColumns: ["title", "code", "order", "_status"],
    preview: previewAt((doc) => `/categories/${doc.slug}`),
  },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", label: "Name", required: true },
    { name: "code", type: "text", required: true, unique: true, admin: { position: "sidebar", description: "The CRM creates this category when a product of it is published." } },
    slugField(),
    orderField,
    { name: "description", type: "textarea" },
    { name: "heroImage", type: "upload", relationTo: "media" },
    { name: "heroVideoUrl", type: "text", label: "Hero video (YouTube / Vimeo link)" },
    { name: "rating", type: "number", min: 1, max: 5, defaultValue: 5, admin: { position: "sidebar", description: "Stars on the home page card." } },
    ...answerFields,
    seoFields,
    plainTextField,
  ],
});

/** The specification shown on the product page and mirrored to the CRM. */
const SPEC_FIELDS = [
  { name: "material", type: "text" as const },
  { name: "capacity", type: "text" as const },
  { name: "dimensions", type: "text" as const },
  { name: "thickness", type: "text" as const },
  { name: "colours", type: "text" as const },
  { name: "lidOptions", type: "text" as const, label: "Lid options" },
  { name: "piecesPerCarton", type: "number" as const, label: "Pieces per carton" },
];

export const Products = publishedContent({
  slug: "products",
  admin: {
    useAsTitle: "title",
    group: "Content",
    defaultColumns: ["title", "code", "category", "_status"],
    preview: previewAt((doc) => `/products/${doc.slug}`),
  },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: "title", type: "text", label: "Name", required: true },
    {
      name: "code",
      type: "text",
      required: true,
      unique: true,
      admin: { position: "sidebar", description: "Must be the CRM product code: it is how the CRM matches this product." },
    },
    slugField(),
    { name: "category", type: "relationship", relationTo: "product-categories", admin: { position: "sidebar" } },
    { name: "customPrinting", type: "checkbox", label: "Custom printing available", admin: { position: "sidebar" } },
    {
      type: "tabs",
      tabs: [
        {
          label: "Details",
          fields: [
            { name: "shortDescription", type: "textarea" },
            { name: "description", type: "richText", label: "Long description" },
            { name: "specs", type: "group", label: "Specification", fields: SPEC_FIELDS },
            { name: "moqDisplay", type: "text", label: "MOQ (shown on the website only)" },
          ],
        },
        {
          label: "Media",
          fields: [
            { name: "photos", type: "upload", relationTo: "media", hasMany: true },
            {
              name: "videos",
              type: "array",
              fields: [
                { name: "file", type: "upload", relationTo: "media", label: "MP4 file" },
                { name: "link", type: "text", label: "or a YouTube / Vimeo link" },
              ],
            },
            { name: "datasheet", type: "upload", relationTo: "media", label: "Datasheet (PDF)" },
          ],
        },
        { label: "Answers", fields: answerFields },
        { label: "SEO", fields: [seoFields] },
      ],
    },
    plainTextField,
  ],
});
