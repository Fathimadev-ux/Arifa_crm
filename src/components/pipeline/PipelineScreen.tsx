"use client";

import { Briefcase, SearchX, Trophy } from "lucide-react";
import { useState } from "react";
import { can } from "@/config/roles";
import { isClosedStage } from "@/config/stages";
import type { DealStage } from "@/lib/api/client";
import { useProducts } from "@/lib/api/catalogue";
import { useRequestsByDeal } from "@/lib/api/change-requests";
import { type Deal, type DealFilters, hasAcceptedQuote, moveDeal, useFilteredDeals } from "@/lib/api/crm";
import { EMPTY_FILTERS, type PipelineFilters, applyFilters, moveBlockedReason } from "@/lib/pipeline-cards";
import { useStaffNames } from "@/hooks/useStaffNames";
import { useSession } from "@/store/session";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { showToast } from "@/components/Toaster";
import { ExportButtons } from "@/components/ExportButtons";
import { KanbanBoard } from "@/components/pipeline/KanbanBoard";
import { PipelineTable } from "@/components/pipeline/PipelineTable";
import { EMPTY_SERVER_FILTERS, type PipelineView, PipelineToolbar, type ServerFilters, ViewToggle } from "@/components/pipeline/PipelineToolbar";
import { Button, ErrorState, LoadingState, PageHeader, StatCard } from "@/components/ui";

/** The backend's query for the toolbar's server filters; unset ones are left out. */
function toDealFilters(server: ServerFilters, ownerId: string): DealFilters {
  return {
    owner_user_id: ownerId || undefined,
    country: server.country.length === 2 ? server.country : undefined,
    product_id: server.productId || undefined,
    min_value_aed: server.minValue || undefined,
    max_value_aed: server.maxValue || undefined,
    unassigned: server.unassigned || undefined,
    escalated: server.escalated || undefined,
    opted_out: server.optedOut || undefined,
  };
}

export function PipelineScreen() {
  const { role } = useSession();
  const { nameOf, staff } = useStaffNames();
  const { data: products } = useProducts();
  const [savedFilters, setFilters] = useState<PipelineFilters>(EMPTY_FILTERS);
  const [serverFilters, setServerFilters] = useState<ServerFilters>(EMPTY_SERVER_FILTERS);
  const [view, setView] = useState<PipelineView>("BOARD");

  // A sales person only sees their own deals, so the owner filter is for the roles that see everyone's.
  const canFilterByOwner = can(role, "SEE_ALL_DEALS");
  const filters = canFilterByOwner ? savedFilters : { ...savedFilters, ownerId: "" };
  const { data: deals, error } = useFilteredDeals(toDealFilters(serverFilters, filters.ownerId));
  const requestsByDeal = useRequestsByDeal();

  if (error && !deals) return <ErrorState message={error.message} />;
  if (!deals) return <LoadingState />;

  const visibleDeals = applyFilters(deals, filters, nameOf);
  const openCount = visibleDeals.filter((deal) => !isClosedStage(deal.stage)).length;
  const wonCount = visibleDeals.filter((deal) => deal.stage === "WON").length;
  const clearFilters = () => {
    setFilters({ ...EMPTY_FILTERS, sort: filters.sort });
    setServerFilters(EMPTY_SERVER_FILTERS);
  };

  const handleMove = async (deal: Deal, targetStage: DealStage) => {
    // Leaving Quotation depends on the quote: once the customer accepted it, Negotiation is skipped.
    const isQuoteAccepted = deal.stage === "QUOTATION" && targetStage !== "LOST" && (await hasAcceptedQuote(deal.id));
    const blockedReason = moveBlockedReason(deal, targetStage, isQuoteAccepted);
    if (blockedReason) return showToast(blockedReason);
    void moveDeal(deal, targetStage);
  };

  return (
    <>
      <PageHeader title="Pipeline" subtitle={`${openCount} open deals`}>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButtons entity="deals" />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard index={1} icon={Briefcase} label="Open deals" value={<AnimatedNumber value={openCount} />} />
        <StatCard index={2} icon={Trophy} label="Won" value={<AnimatedNumber value={wonCount} />} />
      </div>

      <PipelineToolbar
        filters={filters}
        serverFilters={serverFilters}
        onFiltersChange={setFilters}
        onServerFiltersChange={setServerFilters}
        onClear={clearFilters}
        owners={canFilterByOwner ? (staff ?? []).filter((member) => member.role === "sales").map((member) => ({ id: member.id, name: member.full_name })) : []}
        products={(products ?? []).map((product) => ({ id: product.id, name: product.name }))}
        canSeeTeamFlags={canFilterByOwner}
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
        <KanbanBoard deals={visibleDeals} ownerName={nameOf} requestsByDeal={requestsByDeal} onMove={handleMove} />
      ) : (
        <PipelineTable deals={visibleDeals} ownerName={nameOf} />
      )}
    </>
  );
}
