import { DraftPreview } from "@/components/website/DraftPreview";

export const metadata = { title: "Preview · CMS" };

/** The draft website, before publishing. */
export default function PreviewPage() {
  return <DraftPreview />;
}
