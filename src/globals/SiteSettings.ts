import type { GlobalConfig } from "payload";
import { anyone, isAdmin } from "@/cms/access";
import { refreshSiteOnGlobalChange } from "@/cms/hooks";
import { MAX_UPLOAD_MB } from "@/cms/limits";
import { DEFAULT_MAX_VIDEO_MB } from "@/collections/Media";

/** CMS.md §1 site settings: contact details, social links, announcement bar, plus the site-wide defaults. */
export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  admin: { group: "Admin" },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [refreshSiteOnGlobalChange] },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Brand",
          fields: [
            { name: "brandName", type: "text", required: true },
            { name: "logo", type: "upload", relationTo: "media" },
            { name: "pageTitle", type: "text", label: "Default page title" },
            { name: "metaDescription", type: "textarea", label: "Default meta description" },
            { name: "shareImage", type: "upload", relationTo: "media", label: "Default share image" },
          ],
        },
        {
          label: "Contact",
          fields: [
            { name: "headOfficeAddress", type: "textarea" },
            { name: "headOfficePhone", type: "text" },
            { name: "headOfficeEmail", type: "email" },
            { name: "divisionName", type: "text" },
            { name: "divisionAddress", type: "textarea" },
            { name: "divisionPhone", type: "text" },
            { name: "divisionEmail", type: "email" },
            {
              name: "socialLinks",
              type: "array",
              fields: [
                { name: "platform", type: "select", required: true, options: ["Facebook", "Instagram", "LinkedIn", "X", "YouTube", "WhatsApp"].map((value) => ({ label: value, value: value.toLowerCase() })) },
                { name: "url", type: "text", required: true },
              ],
            },
          ],
        },
        {
          label: "Announcement",
          fields: [
            { name: "announcementEnabled", type: "checkbox", label: "Show the announcement bar" },
            { name: "announcementText", type: "text" },
            { name: "announcementLink", type: "text" },
          ],
        },
        {
          label: "Uploads",
          fields: [
            {
              name: "maxVideoUploadMb",
              type: "number",
              label: "Largest video upload (MB)",
              min: 1,
              max: MAX_UPLOAD_MB,
              defaultValue: DEFAULT_MAX_VIDEO_MB,
              admin: { description: `Bigger factory films go on YouTube or Vimeo as a link. The server allows up to ${MAX_UPLOAD_MB} MB at most.` },
            },
          ],
        },
        {
          label: "Company facts",
          description: "Facts AI assistants can cite (GEO): founded, factory size, countries served…",
          fields: [
            {
              name: "companyFacts",
              type: "array",
              fields: [
                { name: "label", type: "text", required: true },
                { name: "value", type: "text", required: true },
              ],
            },
          ],
        },
      ],
    },
  ],
};
