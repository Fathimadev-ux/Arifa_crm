import { Suspense } from "react";
import { CollectionScreen } from "@/components/CollectionScreen";
import { LoadingState } from "@/components/ui";

export default function CollectionPage({ params }: PageProps<"/content/[collection]">) {
  // The type comes from the URL, so it is read inside Suspense to keep navigation instant.
  return (
    <Suspense fallback={<LoadingState />}>
      {params.then(({ collection }) => (
        <CollectionScreen collection={collection} />
      ))}
    </Suspense>
  );
}
