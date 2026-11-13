"use client";

import { Briefcase, SearchX, Trophy } from "lucide-react";
import { useState } from "react";
import { can } from "@/config/roles";
import { isClosedStage } from "@/config/stages";
import type { DealStage } from "@/lib/api/client";
import { type Deal, moveDeal, useDeals } from "@/lib/api/crm";
import { EMPTY_FILTERS, type PipelineFilters, applyFilters, moveBlockedReason } from "@/lib/pipeline-cards";
import { useStaffNames } from "@/hooks/useStaffNames";
import { useSession } from "@/store/session";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { showToast } from "@/components/Toaster";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import { type PipelineView, PipelineToolbar, ViewToggle } from "@/components/pipeline/PipelineToolbar";
import { Button, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/ui";

export function PipelineScreen() {
  const { role } = useSession();
  const { data: deals, error } = useDeals();
  const { nameOf, staff } = useStaffNames();
  const [savedFilters, setFilters] = useState<PipelineFilters>(EMPTY_FILTERS);
  const [view, setView] = useState<PipelineView>("BOARD");

  // A sales person only sees their own deals, so the owner filter is for the roles that see everyone's.
  const canFilterByOwner = can(role, "SEE_ALL_DEALS");
  const filters = canFilterByOwner ? savedFilters : { ...savedFilters, ownerId: "" };

  if (error && !deals) return <ErrorState message={error.message} />;
  if (!deals) return <LoadingState />;

  const visibleDeals = applyFilters(deals, filters, nameOf);
  const openCount = visibleDeals.filter((deal) => !isClosedStage(deal.stage)).length;
  const wonCount = visibleDeals.filter((deal) => deal.stage === "WON").length;
  const clearFilters = () => setFilters({ ...EMPTY_FILTERS, sort: filters.sort });

  const handleMove = (deal: Deal, targetStage: DealStage) => {
    const blockedReason = moveBlockedReason(deal, targetStage);
    if (blockedReason) return showToast(blockedReason);
    void moveDeal(deal, targetStage);
  };

  return (
    <>
      <PageHeader title="Pipeline" subtitle={`${openCount} open deals`}>
        <ViewToggle view={view} onViewChange={setView} />
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard index={1} icon={Briefcase} label="Open deals" value={<AnimatedNumber value={openCount} />} />
        <StatCard index={2} icon={Trophy} label="Won" value={<AnimatedNumber value={wonCount} />} />
      </div>

      <PipelineToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onClear={clearFilters}
        owners={canFilterByOwner ? (staff ?? []).filter((member) => member.role === "sales").map((member) => ({ id: member.id, name: member.full_name })) : []}
      />

      {visibleDeals.length === 0 ? (
        <div className="animate-enter lift panel flex flex-col items-center py-16 text-center">
          <SearchX className="size-6 text-neutral-400" />
          <p className="mt-3 font-medium">No deals</p>
          {deals.length > 0 && (
            <Button variant="secondary" className="mt-5" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "BOARD" ? (
        <KanbanBoard deals={visibleDeals} ownerName={nameOf} onMove={handleMove} />
      ) : (
        <PipelineTable deals={visibleDeals} ownerName={nameOf} />
      )}
    </>
  );
}
