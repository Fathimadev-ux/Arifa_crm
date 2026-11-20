"use client";

import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { type ErpImportResult, importErp } from "@/lib/api/catalogue";
import { showToast } from "@/components/Toaster";
import { Button } from "@/components/ui";

const MAX_BYTES = 10 * 1024 * 1024;

const COUNTS: [keyof ErpImportResult, string][] = [
  ["rows", "Rows"],
  ["created", "New items"],
  ["updated", "Updated"],
  ["sellable", "Sellable"],
  ["not_sellable", "Not sellable"],
  ["linked_to_website", "Linked to website"],
  ["ambiguous_links", "Links to check"],
];

/**
 * D61 the ERP stock list: every row is kept (packing and raw material marked not sellable), closing stock is saved,
 * new sellable items are linked to their website product where safe. Check first (nothing saved), then Save.
 */
export function ErpImport({ onClose }: { onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  // The file stays in memory between the check and the save.
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ErpImportResult | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const check = async (picked: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!picked) return;
    if (picked.size > MAX_BYTES) return showToast("The file must be 10 MB or smaller");
    setIsBusy(true);
    const answer = await importErp(picked, true);
    setFile(answer ? picked : null);
    setResult(answer ?? null);
    setIsBusy(false);
  };

  const save = async () => {
    if (!file) return;
    setIsBusy(true);
    const answer = await importErp(file, false);
    if (answer) setResult(answer);
    setFile(null);
    setIsBusy(false);
  };

  return (
    <section className="animate-enter panel space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight">ERP import</h2>
          <p className="text-xs text-neutral-500">The ERP stock list (CSV or Excel): Category, Item Description, Brand, Unit, OpnStk, In, Out, ClosStk. Prices are never changed.</p>
        </div>
        <button onClick={onClose} className="press rounded-full px-3 py-1.5 text-xs text-neutral-500 hover:bg-black/5 hover:text-black">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input ref={fileInput} type="file" accept=".csv,.xlsx" hidden onChange={(event) => void check(event.target.files?.[0])} />
        <Button variant="secondary" disabled={isBusy} onClick={() => fileInput.current?.click()}>
          <FileUp className="size-4" /> 1. Upload to check
        </Button>
        <Button disabled={!file || isBusy || (result?.errors.length ?? 0) > 0} onClick={() => void save()}>
          2. Save
        </Button>
      </div>

      {result && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">{result.saved ? "Saved" : `Checked ${file?.name ?? ""}: nothing saved yet`}</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {COUNTS.map(([key, label]) => (
              <li key={key} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
                <p className="text-xl font-semibold tabular-nums">{String(result[key])}</p>
                <p className="text-xs text-neutral-500">{label}</p>
              </li>
            ))}
          </ul>
          {result.ambiguous_links > 0 && <p className="text-xs text-neutral-500">Some items could match more than one website product: open each and link it in the product panel.</p>}
          {result.errors.length > 0 && (
            <ul className="space-y-1 rounded-2xl bg-black/[0.03] p-4 text-sm">
              {result.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
