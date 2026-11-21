import { isStaff, publishedOrStaff } from "@/cms/access";
import { answerFields, plainTextField, seoFields, slugField } from "@/cms/fields";
import { publishedContent } from "@/cms/hooks";
import { previewAt } from "@/cms/preview";
import { PAGE_BLOCKS } from "./home-blocks";

/**
 * CMS.md §1 `pages`: title, sections, text, banners, buttons, SEO. The page with slug "home" is the home page;
 * the others (about, custom packaging, quality, privacy, terms…) show at /<slug>.
 */
export const Pages = publishedContent({
  slug: "pages",
  admin: {
    useAsTitle: "title",
    group: "Content",
    defaultColumns: ["title", "slug", "_status", "updatedAt"],
    preview: previewAt((doc) => (doc.slug === "home" ? "/" : `/${doc.slug}`)),
  },
  access: { read: publishedOrStaff, create: isStaff, update: isStaff, delete: isStaff },
  fields: [
    { name: "title", type: "text", required: true },
    slugField(),
    {
      type: "tabs",
      tabs: [
        { label: "Sections", fields: [{ name: "layout", type: "blocks", blocks: PAGE_BLOCKS }] },
        { label: "Text", fields: [{ name: "body", type: "richText" }] },
        { label: "Answers", fields: answerFields },
        { label: "SEO", fields: [seoFields] },
      ],
    },
    plainTextField,
  ],
});
