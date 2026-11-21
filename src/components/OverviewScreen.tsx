"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type CollectionInfo, useCollections, useDocuments } from "@/lib/api/cms";
import { useSession } from "@/store/session";
import { ErrorState, LoadingState, PageHeader, enterDelay } from "@/components/ui";

/** One content type: how many documents, and how many wait to be published. */
function CollectionCard({ collection, index }: { collection: CollectionInfo; index: number }) {
  const { data: documents } = useDocuments(collection.name);
  const waiting = documents?.filter((document) => document.status !== "published").length ?? 0;
  return (
    <Link href={`/content/${collection.name}`} className="group animate-enter lift panel flex items-center justify-between gap-3 p-5" style={enterDelay(index)}>
      <span className="min-w-0">
        <span className="block truncate text-base font-medium tracking-tight">{collection.title}</span>
        <span className="mt-1 block text-xs text-neutral-500">
          {documents ? (collection.single ? "One page of settings" : `${documents.length} ${documents.length === 1 ? "item" : "items"}`) : " "}
          {waiting > 0 && <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[11px] font-medium text-white">{waiting} not published</span>}
        </span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-neutral-400 transition-transform duration-500 group-hover:translate-x-1 group-hover:text-black" />
    </Link>
  );
}

/** The start page: every content type the backend offers, with what still waits to be published. */
export function OverviewScreen() {
  const { user } = useSession();
  const { data: collections, error } = useCollections();
  if (error && !collections) return <ErrorState message={error.message} />;
  if (!collections) return <LoadingState />;
  return (
    <>
      <PageHeader title={user ? `Hello, ${user.full_name.split(" ")[0]}` : "Website content"} subtitle="Edit a draft, preview it, then publish. The website shows it within about a minute." />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {collections.map((collection, index) => (
          <CollectionCard key={collection.name} collection={collection} index={index + 1} />
        ))}
      </div>
    </>
  );
}
