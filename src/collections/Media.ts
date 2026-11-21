import { stat } from "node:fs/promises";
import { APIError, type CollectionBeforeValidateHook, type CollectionConfig } from "payload";
import { anyone, isStaff } from "@/cms/access";

/** Used until an admin sets "Largest video upload" in Site settings. */
export const DEFAULT_MAX_VIDEO_MB = 50;

/** CMS.md §1 "MP4 videos (size limit is a setting)": the admin's limit, checked on every video upload. */
const limitVideoSize: CollectionBeforeValidateHook = async ({ req, data }) => {
  const file = req.file;
  if (!file?.mimetype.startsWith("video/")) return data;
  const settings = await req.payload.findGlobal({ slug: "site-settings", depth: 0, req });
  const maxMb = settings.maxVideoUploadMb || DEFAULT_MAX_VIDEO_MB;
  // Uploads don't always carry their size: measure the bytes (or the temporary file Payload wrote).
  const bytes = file.size || file.data?.byteLength || (file.tempFilePath ? (await stat(file.tempFilePath)).size : 0);
  if (bytes > maxMb * 1024 * 1024) {
    throw new APIError(`Videos can be up to ${maxMb} MB. Put larger films on YouTube or Vimeo and paste the link instead.`, 400, undefined, true);
  }
  return data;
};

/**
 * CMS.md §1 media library: photos (resized and compressed on upload), MP4 videos, PDFs and 3D model files.
 * Large factory films belong on YouTube / Vimeo and are linked instead.
 */
export const Media: CollectionConfig = {
  slug: "media",
  admin: { group: "Content", defaultColumns: ["filename", "alt", "mimeType", "filesize"] },
  access: { read: anyone, create: isStaff, update: isStaff, delete: isStaff },
  hooks: { beforeValidate: [limitVideoSize] },
  upload: {
    staticDir: "media",
    mimeTypes: ["image/*", "video/mp4", "application/pdf", "model/gltf-binary", "model/gltf+json"],
    // Photos: never wider than 2560 px, saved as compressed WebP (videos, PDFs and 3D files are kept as they are).
    resizeOptions: { width: 2560, withoutEnlargement: true },
    formatOptions: { format: "webp", options: { quality: 82 } },
    imageSizes: [
      { name: "card", width: 640, formatOptions: { format: "webp", options: { quality: 78 } } },
      { name: "hero", width: 1920, formatOptions: { format: "webp", options: { quality: 80 } } },
    ],
    adminThumbnail: "card",
  },
  fields: [{ name: "alt", type: "text", label: "Alt text", admin: { description: "What the image shows, for search engines and screen readers." } }],
};
