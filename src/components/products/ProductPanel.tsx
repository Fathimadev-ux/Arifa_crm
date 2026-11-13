"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { can } from "@/config/roles";
import { type Product, type ProductEdit, editProduct, useProductHistory } from "@/lib/api/catalogue";
import { formatDateTime, humanize } from "@/lib/format";
import { useStaffNames } from "@/hooks/useStaffNames";
import { useSession } from "@/store/session";
import { TextInput } from "@/components/forms";
import { ChangeHistory } from "@/components/products/ChangeHistory";
import { PriceTiers } from "@/components/products/PriceTiers";
import { Button, DetailList } from "@/components/ui";

const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));

/** D22: the fields the CRM owns. The manager edits them; everyone else reads them. */
function CrmFields({ product, canEdit }: { product: Product; canEdit: boolean }) {
  const [form, setForm] = useState({
    moq: product.moq?.toString() ?? "",
    carton_qty: product.carton_qty?.toString() ?? "",
    unit: product.unit,
    lead_min: product.default_lead_days_min?.toString() ?? "",
    lead_max: product.default_lead_days_max?.toString() ?? "",
    is_quotable: product.is_quotable,
    is_active: product.is_active,
  });
  const update = (patch: Partial<typeof form>) => setForm((current) => ({ ...current, ...patch }));

  if (!canEdit) {
    return (
      <DetailList
        items={[
          ["MOQ", product.moq?.toLocaleString()],
          ["Carton", product.carton_qty && `${product.carton_qty} ${product.unit}`],
          ["Delivery", product.default_lead_days_min !== null && `${product.default_lead_days_min}–${product.default_lead_days_max} days`],
          ["Quotable", product.is_quotable ? "Yes" : "No"],
          ["Active", product.is_active ? "Yes" : "No"],
        ]}
      />
    );
  }

  const save = () => {
    const edit: ProductEdit = {
      moq: toNumber(form.moq),
      carton_qty: toNumber(form.carton_qty),
      unit: form.unit.trim() || null,
      default_lead_days_min: toNumber(form.lead_min),
      default_lead_days_max: toNumber(form.lead_max),
      is_quotable: form.is_quotable,
      is_active: form.is_active,
    };
    void editProduct(product, edit);
  };

  const toggle = (key: "is_quotable" | "is_active", label: string) => (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={form[key]} onChange={(event) => update({ [key]: event.target.checked })} className="size-4 accent-black" />
      {label}
    </label>
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <TextInput label="MOQ" type="number" min="1" value={form.moq} onChange={(event) => update({ moq: event.target.value })} />
        <TextInput label="Carton qty" type="number" min="1" value={form.carton_qty} onChange={(event) => update({ carton_qty: event.target.value })} />
        <TextInput label="Unit" value={form.unit} onChange={(event) => update({ unit: event.target.value })} maxLength={16} />
        <TextInput label="Delivery days from" type="number" min="0" max="365" value={form.lead_min} onChange={(event) => update({ lead_min: event.target.value })} />
        <TextInput label="to" type="number" min="0" max="365" value={form.lead_max} onChange={(event) => update({ lead_max: event.target.value })} />
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {toggle("is_quotable", "Quotable")}
        {toggle("is_active", "Active")}
        <Button type="submit" className="ml-auto">
          Save
        </Button>
      </div>
    </form>
  );
}

/** One product: CRM fields, price tiers, the specification from the CMS, and its change history. */
export function ProductPanel({ product, onClose }: { product: Product; onClose: () => void }) {
  const { role } = useSession();
  const { nameOf } = useStaffNames();
  const { data: history } = useProductHistory(product.id);
  const specEntries = Object.entries(product.spec).map(([key, value]): [string, string] => [humanize(key), String(value)]);

  return (
    <section className="animate-enter panel space-y-6 p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-light tracking-tight">{product.name}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {product.sku} · {humanize(product.category_code)}
            {product.cms_synced_at && ` · from the CMS ${formatDateTime(product.cms_synced_at)}`}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close" className="press grid size-9 place-items-center rounded-full hover:bg-black/5">
          <X className="size-4" />
        </button>
      </header>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Quoting</h3>
        <CrmFields key={product.id} product={product} canEdit={can(role, "EDIT_PRODUCTS")} />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price tiers</h3>
        <PriceTiers product={product} canEdit={can(role, "EDIT_PRICES")} />
      </div>

      {specEntries.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Specification</h3>
          <DetailList items={specEntries} />
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Changes</h3>
        <ChangeHistory changes={history} nameOf={(id) => nameOf(id)} />
      </div>
    </section>
  );
}
