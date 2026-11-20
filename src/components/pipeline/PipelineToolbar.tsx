"use client";

import { Columns3, List, Search, X } from "lucide-react";
import { type PipelineFilters, type PipelineSort, hasActiveFilters } from "@/lib/pipeline-cards";
import { SegmentedControl } from "@/components/ui";

export type PipelineView = "BOARD" | "TABLE";

const SORT_LABEL: Record<PipelineSort, string> = {
  DEFAULT: "Sort: Default",
  DUE: "Sort: Due soonest",
  UPDATED: "Sort: Recently updated",
};

const VIEWS = [
  { id: "BOARD", label: "Board", icon: Columns3 },
  { id: "TABLE", label: "Table", icon: List },
] as const;

const CONTROL = "glass h-10 rounded-full text-sm shadow-sm transition-[background-color,box-shadow,border-color] outline-none hover:bg-white hover:shadow-md focus:border-black";

/** Filters the backend applies (§20.3 / §7A.3): country, product, value range, and the team board's flags. */
export interface ServerFilters {
  country: string;
  productId: string;
  minValue: string;
  maxValue: string;
  unassigned: boolean;
  escalated: boolean;
  optedOut: boolean;
}

export const EMPTY_SERVER_FILTERS: ServerFilters = { country: "", productId: "", minValue: "", maxValue: "", unassigned: false, escalated: false, optedOut: false };
export const hasServerFilters = (filters: ServerFilters) => Object.entries(filters).some(([, value]) => Boolean(value));

interface PipelineToolbarProps {
  filters: PipelineFilters;
  serverFilters: ServerFilters;
  /** Salespeople to filter by; empty hides the filter. */
  owners: { id: string; name: string }[];
  products: { id: string; name: string }[];
  /** Unassigned and escalated are the team board's filters (manager, MD). */
  canSeeTeamFlags: boolean;
  onFiltersChange: (filters: PipelineFilters) => void;
  onServerFiltersChange: (filters: ServerFilters) => void;
  onClear: () => void;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`press h-10 rounded-full px-4 text-sm shadow-sm transition-colors ${checked ? "bg-black font-medium text-white" : "glass text-neutral-600 hover:bg-white"}`}>
      {label}
    </button>
  );
}

/** One row of controls that scopes the stats, the board and the table together, plus the backend's filters. */
export function PipelineToolbar({ filters, serverFilters, owners, products, canSeeTeamFlags, onFiltersChange, onServerFiltersChange, onClear }: PipelineToolbarProps) {
  const update = (patch: Partial<PipelineFilters>) => onFiltersChange({ ...filters, ...patch });
  const updateServer = (patch: Partial<ServerFilters>) => onServerFiltersChange({ ...serverFilters, ...patch });

  return (
    <div className="animate-enter sticky top-0 z-20 -mx-1 mb-4 flex flex-wrap items-center gap-2 px-1 py-2.5 md:-mx-4 md:px-4">
      <label className="relative w-full sm:w-64">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
          placeholder="Search deals"
          className={`${CONTROL} w-full pr-4 pl-10 placeholder:text-neutral-400`}
        />
      </label>

      {owners.length > 0 && (
        <select
          value={filters.ownerId}
          onChange={(event) => update({ ownerId: event.target.value })}
          aria-label="Owner"
          className={`${CONTROL} min-w-0 flex-1 px-4 sm:flex-none ${filters.ownerId ? "border-black font-medium" : "text-neutral-600"}`}
        >
          <option value="">All owners</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      )}

      <select value={filters.sort} onChange={(event) => update({ sort: event.target.value as PipelineSort })} aria-label="Sort deals" className={`${CONTROL} min-w-0 flex-1 px-4 text-neutral-600 sm:flex-none`}>
        {Object.entries(SORT_LABEL).map(([sort, label]) => (
          <option key={sort} value={sort}>
            {label}
          </option>
        ))}
      </select>

      {(hasActiveFilters(filters) || hasServerFilters(serverFilters)) && (
        <button onClick={onClear} className="press flex h-10 items-center gap-1 rounded-full px-4 text-sm text-neutral-500 transition-colors hover:bg-white/60 hover:text-black">
          <X className="size-3.5" /> Clear
        </button>
      )}

      <div className="flex w-full flex-wrap items-center gap-2">
        <input
          value={serverFilters.country}
          onChange={(event) => updateServer({ country: event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2) })}
          placeholder="Country"
          aria-label="Country (2 letters)"
          className={`${CONTROL} w-28 px-4 placeholder:text-neutral-400`}
        />
        {products.length > 0 && (
          <select value={serverFilters.productId} onChange={(event) => updateServer({ productId: event.target.value })} aria-label="Product" className={`${CONTROL} min-w-0 flex-1 px-4 sm:flex-none ${serverFilters.productId ? "font-medium" : "text-neutral-600"}`}>
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        )}
        <input type="number" min="0" value={serverFilters.minValue} onChange={(event) => updateServer({ minValue: event.target.value })} placeholder="Min AED" aria-label="Minimum value in AED" className={`${CONTROL} w-32 px-4 placeholder:text-neutral-400`} />
        <input type="number" min="0" value={serverFilters.maxValue} onChange={(event) => updateServer({ maxValue: event.target.value })} placeholder="Max AED" aria-label="Maximum value in AED" className={`${CONTROL} w-32 px-4 placeholder:text-neutral-400`} />
        {canSeeTeamFlags && <Toggle label="Unassigned" checked={serverFilters.unassigned} onChange={(unassigned) => updateServer({ unassigned })} />}
        {canSeeTeamFlags && <Toggle label="Escalated" checked={serverFilters.escalated} onChange={(escalated) => updateServer({ escalated })} />}
        <Toggle label="Opted out" checked={serverFilters.optedOut} onChange={(optedOut) => updateServer({ optedOut })} />
      </div>
    </div>
  );
}

export function ViewToggle({ view, onViewChange }: { view: PipelineView; onViewChange: (view: PipelineView) => void }) {
  return <SegmentedControl options={VIEWS} value={view} onChange={onViewChange} label="View" />;
}
