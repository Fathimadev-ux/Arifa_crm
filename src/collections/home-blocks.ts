import type { Block } from "payload";

/** Page sections as blocks (the arifapack.com home sections, plus banners and buttons), arranged by editors. */

const heading = (name = "heading", label = "Heading") => ({ name, label, type: "text" as const, required: true });
const eyebrow = { name: "eyebrow", type: "text" as const, admin: { description: "The small line above the heading." } };
const titledText = (name: string) => ({
  name,
  type: "array" as const,
  fields: [
    { name: "title", type: "text" as const, required: true },
    { name: "text", type: "textarea" as const, required: true, admin: { description: "Wrap words in **double stars** to show them in bold." } },
  ],
});

export const HeroBlock: Block = {
  slug: "hero",
  labels: { singular: "Hero slider", plural: "Hero sliders" },
  fields: [
    {
      name: "slides",
      type: "array",
      minRows: 1,
      fields: [
        { name: "title", type: "textarea", required: true, admin: { description: "Line breaks are kept." } },
        { name: "tagline", type: "text" },
        { name: "subtext", type: "text" },
        { name: "image", type: "upload", relationTo: "media", required: true },
        { name: "productsButtonLabel", type: "text", defaultValue: "Our Products" },
        { name: "contactButtonLabel", type: "text", defaultValue: "Contact Us" },
      ],
    },
  ],
};

/** The product cards come from Product categories, in their order. */
export const ProductsBlock: Block = {
  slug: "productCategories",
  labels: { singular: "Product categories", plural: "Product categories" },
  fields: [heading("heading")],
};

export const AboutBlock: Block = {
  slug: "about",
  labels: { singular: "About", plural: "About" },
  fields: [
    { name: "companyName", type: "text", required: true },
    heading(),
    { name: "intro", type: "textarea", admin: { description: "Shown after the brand name." } },
    { name: "paragraphs", type: "array", fields: [{ name: "text", type: "textarea", required: true }] },
    { name: "image", type: "upload", relationTo: "media" },
    { name: "pillars", type: "array", fields: [{ name: "label", type: "text", required: true }] },
  ],
};

export const SustainabilityBlock: Block = {
  slug: "sustainability",
  labels: { singular: "Sustainability", plural: "Sustainability" },
  fields: [eyebrow, heading(), { name: "statValue", type: "text" }, { name: "statText", type: "text" }, titledText("features")],
};

export const EssentialsBlock: Block = {
  slug: "essentials",
  labels: { singular: "Essentials", plural: "Essentials" },
  fields: [
    heading(),
    {
      name: "categories",
      type: "array",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "icon", type: "upload", relationTo: "media" },
        { name: "items", type: "array", fields: [{ name: "label", type: "text", required: true }] },
      ],
    },
  ],
};

export const ServicesBlock: Block = {
  slug: "services",
  labels: { singular: "Services", plural: "Services" },
  fields: [heading(), { name: "intro", type: "textarea" }, titledText("services"), { name: "buttonLabel", type: "text" }],
};

export const LeadershipBlock: Block = {
  slug: "leadership",
  labels: { singular: "Leadership", plural: "Leadership" },
  fields: [
    eyebrow,
    heading(),
    {
      name: "members",
      type: "array",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "role", type: "text" },
        { name: "photo", type: "upload", relationTo: "media" },
      ],
    },
  ],
};

/** Addresses, phones and emails come from Site settings. */
export const ContactBlock: Block = {
  slug: "contact",
  labels: { singular: "Contact form", plural: "Contact forms" },
  fields: [eyebrow, heading(), { name: "submitLabel", type: "text", defaultValue: "Send Message" }],
};

/** A button an editor can place on any page: label, where it goes, black or outlined. */
const buttonsField = {
  name: "buttons",
  type: "array" as const,
  maxRows: 3,
  fields: [
    { name: "label", type: "text" as const, required: true },
    { name: "link", type: "text" as const, required: true, admin: { description: "A page address (/about, /#contact) or a full link." } },
    {
      name: "style",
      type: "select" as const,
      defaultValue: "primary",
      options: [
        { label: "Black", value: "primary" },
        { label: "Outlined", value: "secondary" },
      ],
    },
  ],
};

/** CMS.md §1 pages "banners, buttons": a heading with text, an optional image and buttons. */
export const BannerBlock: Block = {
  slug: "banner",
  labels: { singular: "Banner", plural: "Banners" },
  fields: [heading(), { name: "text", type: "textarea" }, { name: "image", type: "upload", relationTo: "media" }, buttonsField],
};

/** A row of buttons on its own. */
export const ButtonsBlock: Block = {
  slug: "buttons",
  labels: { singular: "Buttons", plural: "Buttons" },
  fields: [{ ...buttonsField, minRows: 1 }],
};

export const PAGE_BLOCKS = [HeroBlock, BannerBlock, ButtonsBlock, ProductsBlock, AboutBlock, SustainabilityBlock, EssentialsBlock, ServicesBlock, LeadershipBlock, ContactBlock];
