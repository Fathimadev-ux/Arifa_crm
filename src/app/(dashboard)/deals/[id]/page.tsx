import { Suspense } from "react";
import { DealDetail } from "@/components/deal/DealDetail";
import { LoadingState } from "@/components/ui";

export default function DealPage({ params }: PageProps<"/deals/[id]">) {
  // The id comes from the URL, so it is read inside Suspense to keep navigation instant.
  return (
    <Suspense fallback={<LoadingState />}>
      {params.then(({ id }) => (
        <DealDetail id={id} />
      ))}
    </Suspense>
  );
}
