import { type Change, useProducts } from "@/lib/api/catalogue";
import { formatCount, formatDate, humanize } from "@/lib/format";
import { type Column, DataTable } from "@/components/DataTable";

/** Short names for the logged actions; anything else is shown in words. */
const ACTION_TITLE: Record<string, string> = {
  "price_tier.created": "Tier added",
  "price_tier.updated": "Tier changed",
  "price_tier.deleted": "Tier removed",
  "price_list.imported": "Price list uploaded",
  "catalogue.workbook_applied": "Workbook applied",
  "product.created": "Product added",
  "product.updated": "Product changed",
};

/** Workbook counts in words ("1 product updated"), only the ones that are not zero. */
const WORKBOOK_COUNTS: [string, string, string][] = [
  ["products_created", "product created", "products created"],
  ["products_updated", "product updated", "products updated"],
  ["price_lists_changed", "price list changed", "price lists changed"],
  ["categories_changed", "category changed", "categories changed"],
  ["website_drafts", "website draft", "website drafts"],
];

/** Internal values staff don't need (ids, file fingerprints, where the change came from). */
const HIDDEN_FIELDS = new Set(["id", "product_id", "entity_id", "sha256", "file_sha256", "source", "valid_from"]);
const FIELD_LABEL: Record<string, string> = { min_qty: "From qty", max_qty: "To qty", list_price: "List price", min_price: "Min price", moq: "MOQ" };

const isEmpty = (value: unknown) => value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
const price = (value: unknown) => Number(value).toFixed(2);

/** One value in words: prices with 2 decimals, quantities with separators, lists joined. */
function formatValue(key: string, value: unknown): string {
  if (isEmpty(value)) return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  if (/price/.test(key) && !Number.isNaN(Number(value))) return price(value);
  if (!Number.isNaN(Number(value))) return formatCount(String(value));
  return String(value);
}

/** A tier in one phrase: "5,000 – 19,999 pcs · 0.68 (min 0.58)". */
function tierPhrase(values: Record<string, unknown>): string {
  const range = values.max_qty ? `${formatCount(String(values.min_qty))} – ${formatCount(String(values.max_qty))} pcs` : `from ${formatCount(String(values.min_qty ?? 0))} pcs`;
  const prices = `${price(values.list_price)}${isEmpty(values.min_price) ? "" : ` (min ${price(values.min_price)})`}`;
  return `${range} · ${prices}`;
}

/** The Change column: what happened, in a few words. */
function changeText(change: Change): string {
  const before = change.before ?? {};
  const after = change.after ?? {};
  if (change.action === "catalogue.workbook_applied") {
    const counts = WORKBOOK_COUNTS.flatMap(([key, one, many]) => (Number(after[key]) > 0 ? [`${after[key]} ${Number(after[key]) === 1 ? one : many}`] : []));
    return counts.join(" · ") || "No changes";
  }
  if (change.action === "price_list.imported") return [after.rows !== undefined && `${after.rows} rows`, !isEmpty(after.products) && formatValue("products", after.products)].filter(Boolean).join(" · ");
  if (change.action === "price_tier.created") return tierPhrase(after);
  if (change.action === "price_tier.deleted") return tierPhrase(before);
  // A change: only the fields that differ, as "Label old → new".
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !HIDDEN_FIELDS.has(key) && JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map((key) => `${FIELD_LABEL[key] ?? humanize(key)} ${formatValue(key, before[key])} → ${formatValue(key, after[key])}`)
    .join(" · ");
}

/** A product's or the whole price list's change log, newest first, as a table. */
export function ChangeHistory({ changes, nameOf }: { changes: Change[] | undefined; nameOf: (id: string) => string }) {
  const { data: products } = useProducts();
  if (!changes) return <div className="h-16 animate-pulse rounded-2xl bg-neutral-100" />;

  /** The product a change is about (a tier carries product_id; a product change is the product itself). */
  const productOf = (change: Change) => {
    const id = String(change.after?.product_id ?? change.before?.product_id ?? (change.entity_type === "product" ? change.entity_id : ""));
    return products?.find((item) => item.id === id);
  };
  const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("en-AE", { hour: "numeric", minute: "2-digit" });

  const columns: Column<Change>[] = [
    { label: "Date", cell: (change) => formatDate(change.at), sub: (change) => timeOf(change.at), width: "14%" },
    { label: "Who", cell: (change) => (change.actor_type === "staff" || change.actor_type === "user" ? nameOf(change.actor_id) : humanize(change.actor_type)), width: "14%" },
    { label: "What", cell: (change) => ACTION_TITLE[change.action] ?? humanize(change.action.replace(".", " ")), width: "16%" },
    { label: "Product", cell: (change) => productOf(change)?.name ?? "—", sub: (change) => productOf(change)?.sku, width: "22%" },
    // Wraps onto a second line instead of being cut off ("1 product updated · 1 price list changed · …").
    { label: "Change", cell: (change) => <span className="block whitespace-normal">{changeText(change)}</span>, width: "34%" },
  ];

  return (
    <div className="scroll-thin max-h-[36rem] overflow-y-auto">
      <DataTable rows={changes} columns={columns} rowKey={(change) => `${change.at}-${change.entity_id}-${change.action}`} minWidth={760} emptyText="No changes yet" />
    </div>
  );
}
