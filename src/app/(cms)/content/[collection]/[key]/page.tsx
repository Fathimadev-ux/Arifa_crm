import { Suspense } from "react";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { LoadingState } from "@/components/ui";

export default function DocumentPage({ params }: PageProps<"/content/[collection]/[key]">) {
  // The type and key come from the URL, so they are read inside Suspense to keep navigation instant.
  return (
    <Suspense fallback={<LoadingState />}>
      {params.then(({ collection, key }) => (
        <DocumentEditor collection={collection} docKey={decodeURIComponent(key)} />
      ))}
    </Suspense>
  );
}
