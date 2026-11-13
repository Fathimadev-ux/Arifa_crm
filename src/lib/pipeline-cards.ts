import { isClosedStage, nextStageOf } from "@/config/stages";
import type { DealStage } from "@/lib/api/client";
import type { Deal } from "@/lib/api/crm";

export type PipelineSort = "DEFAULT" | "DUE" | "UPDATED";

export interface PipelineFilters {
  search: string;
  ownerId: string;
  sort: PipelineSort;
}

export const EMPTY_FILTERS: PipelineFilters = { search: "", ownerId: "", sort: "DEFAULT" };

export function hasActiveFilters(filters: PipelineFilters): boolean {
  return Boolean(filters.search || filters.ownerId);
}

const SORTERS: Record<PipelineSort, ((a: Deal, b: Deal) => number) | null> = {
  DEFAULT: null,
  // Deals without a next action go last.
  DUE: (a, b) => (a.next_action_at ?? "~").localeCompare(b.next_action_at ?? "~"),
  UPDATED: (a, b) => b.updated_at.localeCompare(a.updated_at),
};

export function applyFilters(deals: Deal[], filters: PipelineFilters, ownerName: (id: string | null) => string): Deal[] {
  const needle = filters.search.trim().toLowerCase();
  const filtered = deals.filter(
    (deal) => (!filters.ownerId || deal.owner_user_id === filters.ownerId) && (!needle || `${deal.number} ${ownerName(deal.owner_user_id)}`.toLowerCase().includes(needle)),
  );
  const sorter = SORTERS[filters.sort];
  return sorter ? filtered.sort(sorter) : filtered;
}

/** Why a deal can't move to `targetStage` from the board, or null when it may (the backend checks the rest). */
export function moveBlockedReason(deal: Deal, targetStage: DealStage): string | null {
  if (targetStage === deal.stage) return null;
  if (isClosedStage(deal.stage)) return "Deal is closed";
  if (targetStage === "LOST") return "Open the deal to mark it lost with a reason";
  if (targetStage !== nextStageOf(deal.stage)) return "Deals move one stage at a time";
  return null;
}

/** The stage this deal can move to with one click, or null. */
export function quickMoveStageOf(deal: Deal): DealStage | null {
  const nextStage = nextStageOf(deal.stage);
  return nextStage && !moveBlockedReason(deal, nextStage) ? nextStage : null;
}
