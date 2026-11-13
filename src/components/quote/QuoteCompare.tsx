import { X } from "lucide-react";
import type { ReactNode } from "react";
import type { QuoteVersion } from "@/lib/api/crm";
import { formatCount, formatDate, formatMoney, humanize } from "@/lib/format";

/** The rows compared; a row whose two values differ is shown in bold. */
function rowsOf(version: QuoteVersion): [label: string, value: string][] {
  return [
    ["Status", humanize(version.status)],
    ...version.lines.map((line): [string, string] => [line.description, `${formatCount(line.quantity)} ${line.unit} × ${formatMoney(line.unit_price, version.currency)}`]),
    ["Total", formatMoney(version.total, version.currency)],
    ["Incoterm", version.incoterm],
    ["Delivery", [version.delivery_time_text, version.delivery_place].filter(Boolean).join(" · ") || "—"],
    ["Payment terms", version.payment_terms_text ?? "—"],
    ["Valid until", version.valid_until ? formatDate(version.valid_until) : "—"],
  ];
}

/** Two quote versions side by side (§20.4), newest on the right. */
export function QuoteCompare({ older, newer, onClose }: { older: QuoteVersion; newer: QuoteVersion; onClose: () => void }) {
  const olderRows = new Map(rowsOf(older));
  const newerRows = new Map(rowsOf(newer));
  const labels = [...new Set([...olderRows.keys(), ...newerRows.keys()])];

  const header = (version: QuoteVersion): ReactNode => <th className="px-3 py-2 text-left text-xs font-semibold">Version {version.version_no}</th>;

  return (
    <div className="animate-enter mt-5 overflow-x-auto rounded-3xl border border-neutral-200 bg-white/60 p-3">
      <div className="flex items-center justify-between px-3 pb-2">
        <p className="text-sm font-semibold">Compare versions</p>
        <button onClick={onClose} aria-label="Close comparison" className="press grid size-8 place-items-center rounded-full hover:bg-black/5">
          <X className="size-4" />
        </button>
      </div>
      <table className="w-full min-w-[480px] table-fixed text-sm">
        <thead>
          <tr className="text-neutral-500">
            <th className="w-1/4 px-3 py-2" />
            {header(older)}
            {header(newer)}
          </tr>
        </thead>
        <tbody className="divide-y divide-dashed divide-neutral-200">
          {labels.map((label) => {
            const before = olderRows.get(label) ?? "—";
            const after = newerRows.get(label) ?? "—";
            const isChanged = before !== after;
            return (
              <tr key={label}>
                <td className="truncate px-3 py-2.5 text-xs text-neutral-500">{label}</td>
                <td className="px-3 py-2.5 text-neutral-500">{before}</td>
                <td className={`px-3 py-2.5 ${isChanged ? "font-semibold" : ""}`}>{after}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
