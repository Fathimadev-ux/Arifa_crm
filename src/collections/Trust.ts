import type { CollectionConfig } from "payload";
import { anyone, isStaff, publishedOrStaff } from "@/cms/access";
import { orderField, plainTextField } from "@/cms/fields";
import { publishedContent } from "@/cms/hooks";

/** CMS.md §1: factory tour hotspots, FAQs, certificates, client logos, testimonials (each published yes / no). */

const contentAccess = { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff };
const listAdmin = (group: string, columns: string[]) => ({ useAsTitle: "title", group, defaultColumns: [...columns, "_status"] });

export const TourHotspots = publishedContent({
  slug: "tour-hotspots",
  labels: { singular: "Tour hotspot", plural: "Tour hotspots" },
  admin: { ...listAdmin("Content", ["title", "order"]), description: "Labels in the factory tour. New 3D scenes or camera moves need a developer." },
  access: contentAccess,
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "text", type: "textarea" },
    orderField,
    { name: "product", type: "relationship", relationTo: "products" },
    { name: "page", type: "relationship", relationTo: "pages" },
    plainTextField,
  ],
});

export const Faqs = publishedContent({
  slug: "faqs",
  labels: { singular: "FAQ", plural: "FAQs" },
  admin: listAdmin("Trust", ["title", "order"]),
  access: contentAccess,
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", label: "Question", required: true },
    { name: "answer", type: "textarea", required: true, admin: { description: "A short, direct answer." } },
    orderField,
    plainTextField,
  ],
});

export const Certificates = publishedContent({
  slug: "certificates",
  admin: listAdmin("Trust", ["title", "order"]),
  access: contentAccess,
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "description", type: "textarea" },
    { name: "file", type: "upload", relationTo: "media", label: "Certificate (PDF or image)" },
    orderField,
    plainTextField,
  ],
});

export const ClientLogos = publishedContent({
  slug: "client-logos",
  labels: { singular: "Client logo", plural: "Client logos" },
  admin: listAdmin("Trust", ["title", "order"]),
  access: contentAccess,
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", label: "Client", required: true },
    { name: "logo", type: "upload", relationTo: "media", required: true },
    { name: "link", type: "text" },
    orderField,
    plainTextField,
  ],
});

export const Testimonials = publishedContent({
  slug: "testimonials",
  admin: listAdmin("Trust", ["title", "company", "order"]),
  access: contentAccess,
  defaultSort: "order",
  fields: [
    { name: "title", type: "text", label: "Name", required: true },
    { name: "company", type: "text" },
    { name: "quote", type: "textarea", required: true },
    orderField,
    plainTextField,
  ],
});

/** Messages from the website's contact form. Anyone may send one; only staff read them. */
export const Enquiries: CollectionConfig = {
  slug: "enquiries",
  admin: { useAsTitle: "subject", group: "Inbox", defaultColumns: ["name", "email", "subject", "isRead", "createdAt"] },
  access: { create: anyone, read: isStaff, update: isStaff, delete: isStaff },
  defaultSort: "-createdAt",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "subject", type: "text", required: true },
    { name: "message", type: "textarea", required: true },
    { name: "isRead", type: "checkbox", label: "Read", defaultValue: false, admin: { position: "sidebar" } },
  ],
};
