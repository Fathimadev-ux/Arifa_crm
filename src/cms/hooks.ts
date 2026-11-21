import { revalidatePath } from "next/cache";
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig, GlobalAfterChangeHook } from "payload";
import { toPlainText } from "./plain-text";
import { notifyPlatformOnChange, notifyPlatformOnDelete } from "./platform-webhook";

/** CMS.md §3: keep `plainText` in step with the document on every save. */
export const fillPlainText: CollectionBeforeChangeHook = ({ data }) => ({ ...data, plainText: toPlainText(data) });

/** "Publishing updates the website within about a minute": refresh every site page right away. */
function refreshSite() {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Outside a Next.js request (e.g. a script): the pages refresh on their own timer instead.
  }
}

const refreshOnPublish: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (!req.context.seeding && (doc._status === "published" || previousDoc?._status === "published")) refreshSite();
  return doc;
};

export const refreshSiteOnGlobalChange: GlobalAfterChangeHook = ({ doc, req }) => {
  if (!req.context.seeding) refreshSite();
  return doc;
};

/**
 * Website content: drafts with versions (draft → preview → publish, each publish keeps the previous version),
 * readable text for the AI, the platform webhook and a site refresh on publish.
 */
export function publishedContent(config: Omit<CollectionConfig, "versions" | "hooks">): CollectionConfig {
  return {
    ...config,
    versions: { drafts: true, maxPerDoc: 25 },
    hooks: {
      beforeChange: [fillPlainText],
      afterChange: [notifyPlatformOnChange, refreshOnPublish],
      afterDelete: [notifyPlatformOnDelete],
    },
  };
}
