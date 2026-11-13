import type { Change } from "@/lib/api/catalogue";
import { formatDateTime, humanize } from "@/lib/format";

/** Which fields changed, as "field: old → new" (§3 "every change is logged" with old and new value). */
function describe(change: Change): string {
  const before = change.before ?? {};
  const after = change.after ?? {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (keys.length === 0) return humanize(change.entity_type);
  return keys.map((key) => `${humanize(key)}: ${before[key] ?? "—"} → ${after[key] ?? "—"}`).join(" · ");
}

/** A product's or the whole price list's change log, newest first. */
export function ChangeHistory({ changes, nameOf }: { changes: Change[] | undefined; nameOf: (id: string) => string }) {
  if (!changes) return <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />;
  if (changes.length === 0) return <p className="text-sm text-neutral-400">No changes yet</p>;
  return (
    <ol className="space-y-3">
      {changes.map((change, index) => (
        <li key={`${change.at}-${index}`} className="-mx-2 rounded-2xl px-2 py-1 transition-colors hover:bg-black/[0.04]">
          <p className="text-sm font-medium">
            {humanize(change.action)} <span className="font-normal text-neutral-400">· {change.actor_type === "staff" ? nameOf(change.actor_id) : humanize(change.actor_type)}</span>
          </p>
          <p className="mt-0.5 text-sm text-neutral-600">{describe(change)}</p>
          <p className="mt-0.5 text-xs text-neutral-400">{formatDateTime(change.at)}</p>
        </li>
      ))}
    </ol>
  );
}
