"use client";

import { FileDown, FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { type FieldChange as FieldChangeOut, type TierChange as TierChangeOut, type WorkbookApplied, type WorkbookIssue as IssueOut, type WorkbookPreview, applyWorkbook, downloadWorkbook, previewWorkbook } from "@/lib/api/catalogue";
import { humanize } from "@/lib/format";
import { showToast } from "@/components/Toaster";
import { Button } from "@/components/ui";

const MAX_BYTES = 10 * 1024 * 1024;

const show = (value: unknown) => (value === null || value === undefined || value === "" ? "—" : String(value));
/** A tier row [from qty, to qty, list price, minimum price]; null = no upper limit / no minimum. */
const tierText = ([from, to, list, minimum]: (string | null)[]) => `${from}${to ? `–${to}` : "+"} · ${list}${minimum ? ` (min ${minimum})` : ""}`;

function Changes({ changes }: { changes: FieldChangeOut[] }) {
  return (
    <ul className="space-y-0.5 text-xs text-neutral-600">
      {changes.map((change) => (
        <li key={change.field}>
          {humanize(change.field)}: <span className="text-neutral-400 line-through">{show(change.before)}</span> → <span className="font-medium text-black">{show(change.after)}</span>
        </li>
      ))}
    </ul>
  );
}

function Issues({ title, issues }: { title: string; issues: IssueOut[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="overflow-x-auto rounded-2xl ring-1 ring-black/5">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead className="bg-black/5 text-neutral-500">
            <tr>
              {["Sheet", "Row", "Column", "Problem"].map((label) => (
                <th key={label} className="px-3 py-2 font-medium">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {issues.map((issue) => (
              <tr key={`${issue.sheet}-${issue.row}-${issue.column}-${issue.message}`} className="border-t border-dashed border-neutral-200">
                <td className="px-3 py-2">{issue.sheet}</td>
                <td className="px-3 py-2">{issue.row}</td>
                <td className="px-3 py-2">{issue.column}</td>
                <td className="px-3 py-2">{issue.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PriceListChanges({ priceLists }: { priceLists: TierChangeOut[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Price lists</p>
      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {priceLists.map((list) => (
          <li key={list.code} className="rounded-2xl bg-white p-4 text-xs ring-1 ring-black/5">
            <p className="mb-2 font-semibold">{list.code}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-neutral-400">Before</p>
                {(list.before ?? []).map((row) => <p key={row.join()} className="text-neutral-500">{tierText(row)}</p>)}
                {!list.before?.length && <p className="text-neutral-400">No tiers</p>}
              </div>
              <div>
                <p className="mb-1 text-neutral-400">After</p>
                {(list.after ?? []).map((row) => <p key={row.join()} className="font-medium">{tierText(row)}</p>)}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewPanel({ preview }: { preview: WorkbookPreview }) {
  const { summary } = preview;
  const counts: [string, number][] = [
    ["New products", summary.new_products],
    ["Updated products", summary.updated_products],
    ["Unchanged", summary.unchanged_products],
    ["Price lists changed", summary.price_lists_changed],
    ["Categories changed", summary.categories_changed],
    ["Website drafts", summary.website_drafts],
  ];
  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {counts.map(([label, value]) => (
          <li key={label} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-black/5">
            <p className="text-xl font-semibold tabular-nums">{value}</p>
            <p className="text-xs text-neutral-500">{label}</p>
          </li>
        ))}
      </ul>
      {preview.errors.length > 0 && <Issues title={`${preview.errors.length} problems to fix (nothing can be saved until they are)`} issues={preview.errors} />}
      {preview.warnings.length > 0 && <Issues title="Warnings (you can still save)" issues={preview.warnings} />}
      {preview.products.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Products</p>
          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {preview.products.map((product) => (
              <li key={product.code} className="space-y-1.5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <p className="text-sm font-semibold">
                  {product.code}
                  {product.is_new && <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[11px] text-white">New</span>}
                  {product.website_draft && <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium text-neutral-600">Website draft</span>}
                </p>
                <Changes changes={product.changes} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview.price_lists.length > 0 && <PriceListChanges priceLists={preview.price_lists} />}
      {preview.categories.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Categories</p>
          {preview.categories.map((category) => (
            <div key={category.code} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
              <p className="text-sm font-semibold">
                {category.code}
                {category.is_new && <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-[11px] text-white">New</span>}
              </p>
              <Changes changes={category.changes} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * §5.1 the product workbook: one Excel for products, prices and website details. Download today's catalogue, change
 * cells, upload to see every change (nothing saved), then Apply. Product details go to the CMS as drafts.
 */
export function ProductWorkbook({ onClose }: { onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  // The file stays in memory between preview and apply, so nobody picks it twice.
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WorkbookPreview | null>(null);
  const [applied, setApplied] = useState<WorkbookApplied | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const upload = async (picked: File | undefined) => {
    if (fileInput.current) fileInput.current.value = "";
    if (!picked) return;
    if (picked.size > MAX_BYTES) return showToast("The file must be 10 MB or smaller");
    setIsBusy(true);
    setApplied(null);
    const result = await previewWorkbook(picked);
    setFile(result ? picked : null);
    setPreview(result ?? null);
    setIsBusy(false);
  };

  const apply = async () => {
    if (!file || !preview) return;
    setIsBusy(true);
    const result = await applyWorkbook(file, preview.token);
    // Saved, or refused (e.g. the catalogue changed since the preview): either way this preview is spent.
    setPreview(null);
    setFile(null);
    setApplied(result ?? null);
    setIsBusy(false);
  };

  return (
    <section className="animate-enter panel space-y-5 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Product workbook</h2>
          <p className="text-xs text-neutral-500">One Excel for products, prices and website details. A blank cell keeps the value; “-” clears it; never change a code.</p>
        </div>
        <button onClick={onClose} className="press rounded-full px-3 py-1.5 text-xs text-neutral-500 hover:bg-black/5 hover:text-black">
          Close
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void downloadWorkbook()}>
          <FileDown className="size-4" /> 1. Download current catalogue
        </Button>
        <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={(event) => void upload(event.target.files?.[0])} />
        <Button variant="secondary" disabled={isBusy} onClick={() => fileInput.current?.click()}>
          <FileUp className="size-4" /> 2. Upload to check
        </Button>
        <Button disabled={!preview?.ok || isBusy} onClick={() => void apply()}>
          3. Apply
        </Button>
      </div>

      {file && preview && <p className="text-xs text-neutral-500">Checked {file.name}. Nothing is saved until you apply.</p>}
      {preview && <PreviewPanel preview={preview} />}
      {applied && (
        <div className="animate-enter rounded-3xl bg-black p-5 text-sm text-white">
          Saved: {applied.products_created} new, {applied.products_updated} updated, {applied.price_lists_changed} price lists, {applied.categories_changed} categories.{" "}
          {applied.website_drafts > 0 && `${applied.website_drafts} product(s) were sent to the website as drafts: open the CMS, preview and publish them.`}
        </div>
      )}
    </section>
  );
}
