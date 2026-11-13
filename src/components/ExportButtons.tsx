"use client";

import { Download } from "lucide-react";
import { type ExportEntity, type ExportFormat, exportList } from "@/lib/api/records";

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "csv", label: "CSV" },
  { id: "xlsx", label: "Excel" },
];

/** §20.12: download this list as CSV or Excel. */
export function ExportButtons({ entity }: { entity: ExportEntity }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/5 p-1" role="group" aria-label="Export">
      <Download className="mx-2 size-3.5 text-neutral-500" />
      {FORMATS.map((format) => (
        <button key={format.id} onClick={() => void exportList(entity, format.id)} className="press rounded-full px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-white hover:text-black hover:shadow-sm">
          {format.label}
        </button>
      ))}
    </div>
  );
}
