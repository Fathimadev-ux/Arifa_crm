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
export type Change = Schemas["ChangeOut"];
export type ImportResult = Schemas["ImportOut"];
export type StockItem = Schemas["StockOut"];

const productPath = (id: string) => ({ params: { path: { product_id: id } } });
const tierPath = (id: string) => ({ params: { path: { tier_id: id } } });

export const useProducts = () => useApi("products", async () => unwrap(await api.GET("/v1/products")));
export const usePriceTiers = (productId: string | null) =>
  useApi(productId ? `products:${productId}:tiers` : null, async () => unwrap(await api.GET("/v1/products/{product_id}/price-tiers", productPath(productId!))));
export const useProductHistory = (productId: string | null) =>
  useApi(productId ? `products:${productId}:history` : null, async () => unwrap(await api.GET("/v1/products/{product_id}/history", { ...productPath(productId!), params: { ...productPath(productId!).params, query: { limit: 50 } } })));
export const usePriceListHistory = () => useApi("products:price-list-history", async () => unwrap(await api.GET("/v1/price-list/history", { params: { query: { limit: 100 } } })));
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

export function setStock(item: Pick<StockItem, "product_id" | "material_code" | "unit">, quantity: string) {
  return runAction(async () => unwrap(await api.PUT("/v1/stock", { body: { product_id: item.product_id, material_code: item.material_code, quantity, unit: item.unit } })), "Stock saved", ["stock"]);
}
