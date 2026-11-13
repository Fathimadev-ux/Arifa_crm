"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { stageLabel } from "@/config/stages";
import type { Deal } from "@/lib/api/crm";
import { formatRelative, humanize } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { Avatar } from "@/components/ui";

/** Fixed widths keep every column lined up, whatever the text length. */
const COLUMNS = [
  { label: "Deal", width: "22%" },
  { label: "Stage", width: "18%" },
  { label: "AI", width: "18%" },
  { label: "Owner", width: "20%" },
  { label: "Next action", width: "22%" },
];

/** Every cell follows the same pattern: a main line, then a small grey line under it. */
function Cell({ main, sub, subIsStrong = false }: { main: ReactNode; sub?: ReactNode; subIsStrong?: boolean }) {
  return (
    <td className="px-4 py-3.5 align-middle">
      <p className="truncate text-sm font-medium">{main}</p>
      <p className={`mt-0.5 truncate text-xs ${subIsStrong ? "font-medium text-black" : "text-neutral-500"}`}>{sub ?? " "}</p>
    </td>
  );
}

export function PipelineTable({ deals, ownerName }: { deals: Deal[]; ownerName: (id: string | null) => string }) {
  const router = useRouter();
  const now = useNow();

  return (
    <div className="animate-enter lift panel overflow-x-auto p-2">
      <table className="w-full min-w-[760px] table-fixed text-sm">
        <colgroup>
          {COLUMNS.map((column) => (
            <col key={column.label} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr className="text-left text-xs text-neutral-500">
            {COLUMNS.map((column) => (
              <th key={column.label} scope="col" className="px-4 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-neutral-200">
          {deals.map((deal) => {
            const owner = ownerName(deal.owner_user_id);
            const isOverdue = now !== null && deal.next_action_at !== null && new Date(deal.next_action_at).getTime() < now;
            return (
              <tr key={deal.id} onClick={() => router.push(`/deals/${deal.id}`)} className="cursor-pointer transition-colors hover:bg-white/60">
                <Cell
                  main={
                    <Link href={`/deals/${deal.id}`} onClick={(event) => event.stopPropagation()} className="font-semibold hover:underline">
                      {deal.number}
                    </Link>
                  }
                  sub={deal.opted_out_at ? "Opted out" : undefined}
                  subIsStrong
                />
                <Cell main={stageLabel(deal.stage)} />
                <Cell main={deal.ai_enabled ? "On" : "Paused"} sub={deal.ai_paused_reason ? humanize(deal.ai_paused_reason) : undefined} />
                <Cell
                  main={
                    <span className="flex items-center gap-2">
                      <Avatar name={owner} /> {owner}
                    </span>
                  }
                />
                <Cell
                  main={deal.next_action_at && now !== null ? formatRelative(deal.next_action_at, now) : "—"}
                  sub={isOverdue ? "Overdue" : undefined}
                  subIsStrong={isOverdue}
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
