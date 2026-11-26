"use client";

/** §20.7 catalogue and price list, §20.8 stock. Price changes are manager steps and every change is logged (§3). */
import { api, unwrap, type Schemas } from "./client";
import { runAction } from "./crm";
import { saveFile } from "./records";
import { useApi } from "./use-api";

export type Product = Schemas["ProductRow"];
export type ProductEdit = Schemas["ProductEditIn"];
export type PriceTier = Schemas["PriceTierOut"];
export type PriceTierInput = Schemas["PriceTierIn"];
export type PriceTierPatch = Schemas["PriceTierPatch"];
export type Change = Schemas["kx__crm__api__screens__ChangeOut"];
export type WorkbookPreview = Schemas["PreviewOut"];
export type WorkbookApplied = Schemas["AppliedOut"];
export type WorkbookIssue = Schemas["IssueOut"];
export type FieldChange = Schemas["FieldChangeOut"];
export type TierChange = Schemas["TierChangeOut"];
export type ImportResult = Schemas["ImportOut"];
export type StockItem = Schemas["StockOut"];

const productPath = (id: string) => ({ params: { path: { product_id: id } } });
const tierPath = (id: string) => ({ params: { path: { tier_id: id } } });

export type ErpImportResult = Schemas["ErpImportOut"];
export type WebsiteVariant = Schemas["VariantOut"];
export interface ProductFilters {
  category?: string;
  quotable?: boolean;
}

export const useProducts = () => useApi("products", async () => unwrap(await api.GET("/v1/products")));

/** One product, loaded when it is opened (null skips the call). Under "products", so a save or link reloads it too. */
export const useProduct = (id: string | null) => useApi(id ? `products:one:${id}` : null, async () => unwrap(await api.GET("/v1/products/{product_id}", productPath(id!))));

/** The catalogue filtered by the backend (category, quotable only); without filters it is useProducts. */
export function useFilteredProducts(filters: ProductFilters) {
  const query = { category: filters.category || undefined, quotable: filters.quotable || undefined };
  const isFiltered = query.category !== undefined || query.quotable !== undefined;
  return useApi(isFiltered ? `products:filtered:${JSON.stringify(query)}` : "products", async () => unwrap(await api.GET("/v1/products", { params: { query } })));
}

/** The sellable variants of a website product, as the AI describes them (no amounts). */
export const useWebsiteVariants = (cmsProductId: string | null) =>
  useApi(cmsProductId ? `products:variants:${cmsProductId}` : null, async () =>
    unwrap(await api.GET("/v1/catalogue/website-products/{cms_product_id}/variants", { params: { path: { cms_product_id: cmsProductId! } } })),
  );

/** Link an ERP item to its website product, or unlink it (null). */
export function setWebsiteLink(product: Product, cmsProductId: string | null) {
  return runAction(
    async () => {
      unwrap(await api.PUT("/v1/catalogue/products/{sku}/website-link", { params: { path: { sku: product.sku } }, body: { cms_product_id: cmsProductId } }));
      return true;
    },
    cmsProductId ? `${product.name} linked to its website product` : `${product.name} unlinked from the website`,
    ["products"],
  );
}

/**
 * D61: the ERP stock list (CSV or .xlsx: Category, Item Description, Brand, Unit, OpnStk, In, Out, ClosStk). With
 * `dryRun` nothing is saved: the answer shows what would change. Prices are never touched.
 */
export function importErp(file: File, dryRun: boolean) {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  return runAction(
    async () =>
      unwrap(
        await api.POST("/v1/catalogue/erp-import", {
          params: { query: { dry_run: dryRun } },
          body: file as never,
          bodySerializer: (body: unknown) => body as BodyInit,
          headers: { "Content-Type": isCsv ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        }),
      ),
    dryRun ? "ERP list checked: nothing saved yet" : "ERP list saved",
    dryRun ? [] : ["products", "stock"],
  );
}
export const usePriceTiers = (productId: string | null) =>
  useApi(productId ? `products:${productId}:tiers` : null, async () => unwrap(await api.GET("/v1/products/{product_id}/price-tiers", productPath(productId!))));
export const useProductHistory = (productId: string | null) =>
  useApi(productId ? `products:${productId}:history` : null, async () => unwrap(await api.GET("/v1/products/{product_id}/history", { ...productPath(productId!), params: { ...productPath(productId!).params, query: { limit: 50 } } })));
/** Only while "Price changes" is open (false skips the call). */
export const usePriceListHistory = (isOpen: boolean) => useApi(isOpen ? "products:price-list-history" : null, async () => unwrap(await api.GET("/v1/price-list/history", { params: { query: { limit: 100 } } })));
export const useStock = () => useApi("stock", async () => unwrap(await api.GET("/v1/stock")));

/** D22: only the CRM-owned fields (MOQ, carton, unit, delivery days, quotable / active); the CMS owns the rest. */
export function editProduct(product: Product, edit: ProductEdit) {
  return runAction(async () => unwrap(await api.PATCH("/v1/products/{product_id}", { ...productPath(product.id), body: edit })), `${product.name} saved`, ["products"]);
}

export function addPriceTier(product: Product, tier: PriceTierInput) {
  return runAction(async () => unwrap(await api.POST("/v1/products/{product_id}/price-tiers", { ...productPath(product.id), body: tier })), "Price tier added", [`products:${product.id}`, "products:price-list-history"]);
}

export function editPriceTier(tier: PriceTier, patch: PriceTierPatch) {
  return runAction(async () => unwrap(await api.PATCH("/v1/price-tiers/{tier_id}", { ...tierPath(tier.id), body: patch })), "Price tier saved", [`products:${tier.product_id}`, "products:price-list-history"]);
}

export function removePriceTier(tier: PriceTier) {
  return runAction(async () => unwrap(await api.DELETE("/v1/price-tiers/{tier_id}", tierPath(tier.id))), "Price tier removed", [`products:${tier.product_id}`, "products:price-list-history"]);
}

/** §10: the .xlsx itself is the body. Every row is checked first; any error saves nothing and lists the rows. */
export async function importPriceList(file: File): Promise<ImportResult | undefined> {
  return runAction(
    async () =>
      unwrap(
        await api.POST("/v1/price-list/import", {
          body: file as never,
          bodySerializer: (body: unknown) => body as BodyInit,
          headers: { "Content-Type": file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
        }),
      ) as ImportResult,
    "Price list checked",
    ["products"],
  );
}

export function exportPriceList() {
  return runAction(
    async () => {
      const result = await api.GET("/v1/price-list/export", { parseAs: "stream" });
      unwrap(result);
      await saveFile(result.response, "price-list.xlsx");
      return true;
    },
    "Price list downloaded",
    [],
  );
}

// ---------- Product workbook (§5.1): one Excel for products, prices and website details ----------

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const fileBody = (file: File) => ({ body: file as never, bodySerializer: (body: unknown) => body as BodyInit, headers: { "Content-Type": XLSX_TYPE } });

export function downloadWorkbook() {
  return runAction(
    async () => {
      const result = await api.GET("/v1/catalogue/workbook", { parseAs: "stream" });
      unwrap(result);
      await saveFile(result.response, "product-workbook.xlsx");
      return true;
    },
    "Catalogue downloaded",
    [],
  );
}

/** Saves nothing: every change, error and warning, plus the token Apply needs. */
export function previewWorkbook(file: File) {
  return runAction(async () => unwrap(await api.POST("/v1/catalogue/workbook/preview", fileBody(file))), "File checked", []);
}

/** The same file as the preview. All or nothing; 409 = the catalogue changed since the preview. */
export function applyWorkbook(file: File, token: string) {
  return runAction(async () => unwrap(await api.POST("/v1/catalogue/workbook/apply", { ...fileBody(file), params: { query: { token } } })), "Catalogue saved", ["products", "stock"]);
}

export function setStock(item: Pick<StockItem, "product_id" | "material_code" | "unit">, quantity: string) {
  return runAction(async () => unwrap(await api.PUT("/v1/stock", { body: { product_id: item.product_id, material_code: item.material_code, quantity, unit: item.unit } })), "Stock saved", ["stock"]);
}
