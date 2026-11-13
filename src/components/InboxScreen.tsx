"use client";

import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useInbox } from "@/lib/api/crm";
import { humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { EmptyRow, InboxRow } from "@/components/lists";
import { ErrorState, LoadingState, PageHeader, SegmentedControl } from "@/components/ui";

const ALL = "all";

/** §20.2 My inbox: everything waiting for this person, overdue first, then by due time. */
export function InboxScreen() {
  const { data: inbox, error } = useInbox();
  const now = useNow();
  const [kind, setKind] = useState(ALL);

  if (error && !inbox) return <ErrorState message={error.message} />;
  if (!inbox || now === null) return <LoadingState />;

  const kinds = [...new Set(inbox.map((item) => item.kind))];
  const tabs = [{ id: ALL, label: "All" }, ...kinds.map((id) => ({ id, label: humanize(id) }))];
  const items = inbox
    .filter((item) => kind === ALL || item.kind === kind)
    .sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.due_at ?? "~").localeCompare(b.due_at ?? "~"));
  const overdueCount = inbox.filter((item) => item.overdue).length;

  return (
    <>
      <PageHeader title="Inbox" subtitle={overdueCount > 0 ? `${inbox.length} waiting · ${overdueCount} overdue` : `${inbox.length} waiting`}>
        {kinds.length > 1 && <SegmentedControl options={tabs} value={kinds.includes(kind) ? kind : ALL} onChange={setKind} label="Type" />}
      </PageHeader>
      <section className="animate-enter panel p-4">
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <InboxRow key={`${item.kind}-${item.ref_id}`} item={item} now={now} />
            ))}
          </AnimatePresence>
        </ul>
        {items.length === 0 && <EmptyRow text="Nothing waiting" />}
      </section>
    </>
  );
}
