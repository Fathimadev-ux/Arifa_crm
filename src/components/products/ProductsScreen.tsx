"use client";

import { Boxes, FileDown, FileSpreadsheet, FileUp, History } from "lucide-react";
import { useRef, useState } from "react";
import { can } from "@/config/roles";
import { type ImportResult, type Product, exportPriceList, importPriceList, useFilteredProducts, usePriceListHistory, useProducts } from "@/lib/api/catalogue";
import { humanize } from "@/lib/format";
import { useStaffNames } from "@/hooks/useStaffNames";
import { useSession } from "@/store/session";
import { type Column, DataTable, SearchBox } from "@/components/DataTable";
import { ExportButtons } from "@/components/ExportButtons";
import { ChangeHistory } from "@/components/products/ChangeHistory";
import { ProductPanel } from "@/components/products/ProductPanel";
import { ProductWorkbook } from "@/components/products/ProductWorkbook";
import { ErpImport } from "@/components/products/ErpImport";
import { Button, ErrorState, LoadingState, PageHeader, Section } from "@/components/ui";

const columns: Column<Product>[] = [
  { label: "Product", cell: (product) => product.name, sub: (product) => [product.sku, product.custom_printing && "custom printing"].filter(Boolean).join(" · "), width: "30%" },
  { label: "Category", cell: (product) => humanize(product.category_code), width: "16%" },
  { label: "MOQ", cell: (product) => product.moq?.toLocaleString() ?? "—", sub: (product) => product.carton_qty && `Carton ${product.carton_qty}`, width: "14%" },
  { label: "Delivery", cell: (product) => (product.default_lead_days_min !== null ? `${product.default_lead_days_min}–${product.default_lead_days_max} days` : "—"), width: "14%" },
  { label: "Quoting", cell: (product) => (product.is_quotable ? "Quotable" : "Not quotable"), sub: (product) => (product.is_active ? undefined : "Inactive"), width: "14%" },
  { label: "Website", cell: (product) => (product.cms_published ? "Published" : "Hidden"), width: "12%" },
];

/** The §10 import answer: how many rows were saved, or the rows to fix (nothing is saved when any row fails). */
function ImportResultNote({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <div className="animate-enter panel mb-4 space-y-2 p-5 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{result.errors.length ? `Nothing saved: ${result.errors.length} rows to fix` : `${result.saved} rows saved`}</p>
        <button onClick={onClose} className="press rounded-full px-3 py-1.5 text-xs text-neutral-500 hover:bg-black/5 hover:text-black">
          Close
        </button>
      </div>
      {result.errors.map((error) => (
        <p key={`${error.row}-${error.field}`} className="text-neutral-600">
          Row {error.row} · {error.field}: {error.error}
        </p>
      ))}
    </div>
  );
}

/** §20.7 the product catalogue, its price list (Excel in and out) and the price list's change history. */
export function ProductsScreen() {
  const { role } = useSession();
  const { nameOf } = useStaffNames();
  // The full catalogue gives the category list; the table shows the backend's filtered list.
  const { data: allProducts } = useProducts();
  const [category, setCategory] = useState("");
  const [isQuotableOnly, setIsQuotableOnly] = useState(false);
  const { data: products, error } = useFilteredProducts({ category, quotable: isQuotableOnly });
  const categories = [...new Set((allProducts ?? []).map((product) => product.category_code))].sort();
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { data: history } = usePriceListHistory();
  const canEditPrices = can(role, "EDIT_PRICES");
  const canUseWorkbook = can(role, "USE_WORKBOOK");
  const [isWorkbookOpen, setIsWorkbookOpen] = useState(false);
  const [isErpOpen, setIsErpOpen] = useState(false);

  const needle = search.trim().toLowerCase();
  const visible = products?.filter((product) => !needle || `${product.name} ${product.sku} ${product.category_code}`.toLowerCase().includes(needle)) ?? [];
  const openProduct = products?.find((product) => product.id === openId);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const result = await importPriceList(file);
    if (result) setImportResult(result);
    if (fileInput.current) fileInput.current.value = "";
  };

  return (
    <>
      <PageHeader title="Products" subtitle={products ? `${products.length} products` : undefined}>
        <ExportButtons entity="products" />
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, SKU or category" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category" className="glass h-10 rounded-full px-4 text-sm shadow-sm outline-none hover:bg-white">
          <option value="">All categories</option>
          {categories.map((code) => (
            <option key={code} value={code}>
              {humanize(code)}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-pressed={isQuotableOnly}
          onClick={() => setIsQuotableOnly((only) => !only)}
          className={`press h-10 rounded-full px-4 text-sm shadow-sm transition-colors ${isQuotableOnly ? "bg-black font-medium text-white" : "glass text-neutral-600 hover:bg-white"}`}
        >
          Quotable only
        </button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setIsHistoryOpen((open) => !open)}>
            <History className="size-4" /> Price changes
          </Button>
          <Button variant="secondary" onClick={() => void exportPriceList()}>
            <FileDown className="size-4" /> Price list
          </Button>
          {canUseWorkbook && (
            <>
              <Button variant="secondary" onClick={() => setIsWorkbookOpen((open) => !open)}>
                <FileSpreadsheet className="size-4" /> Product workbook
              </Button>
              <Button variant="secondary" onClick={() => setIsErpOpen((open) => !open)}>
                <Boxes className="size-4" /> ERP import
              </Button>
            </>
          )}
          {canEditPrices && (
            <>
              <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={(event) => void upload(event.target.files?.[0])} />
              <Button onClick={() => fileInput.current?.click()}>
                <FileUp className="size-4" /> Import Excel
              </Button>
            </>
          )}
        </div>
      </div>

      {isErpOpen && (
        <div className="mb-4">
          <ErpImport onClose={() => setIsErpOpen(false)} />
        </div>
      )}
      {isWorkbookOpen && (
        <div className="mb-4">
          <ProductWorkbook onClose={() => setIsWorkbookOpen(false)} />
        </div>
      )}
      {importResult && <ImportResultNote result={importResult} onClose={() => setImportResult(null)} />}
      {isHistoryOpen && (
        <div className="mb-4">
          <Section title="Price list changes">
            <ChangeHistory changes={history} nameOf={(id) => nameOf(id)} />
          </Section>
        </div>
      )}
      {openProduct && (
        <div className="mb-4">
          <ProductPanel product={openProduct} onClose={() => setOpenId(null)} />
        </div>
      )}

      {error && !products ? (
        <ErrorState message={error.message} />
      ) : products ? (
        <DataTable rows={visible} columns={columns} rowKey={(product) => product.id} activeKey={openId} onRowClick={(product) => setOpenId(product.id)} emptyText="No products found" />
      ) : (
        <LoadingState />
      )}
    </>
  );
}
