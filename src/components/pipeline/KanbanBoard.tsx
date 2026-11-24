"use client";

import { useState } from "react";
import { STAGES } from "@/config/stages";
import type { DealStage } from "@/lib/api/client";
import type { DealRequests } from "@/lib/api/change-requests";
import { type Deal, hasAcceptedQuote } from "@/lib/api/crm";
import { quickMoveStageOf } from "@/lib/pipeline-cards";
import { DealCard } from "@/components/pipeline/DealCard";

interface KanbanBoardProps {
  deals: Deal[];
  ownerName: (id: string | null) => string;
  requestsByDeal: Map<string, DealRequests>;
  onMove: (deal: Deal, targetStage: DealStage) => void;
}

export function KanbanBoard({ deals, ownerName, requestsByDeal, onMove }: KanbanBoardProps) {
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [hoveredStage, setHoveredStage] = useState<DealStage | null>(null);
  // A card in Quotation whose quote the customer accepted goes to Ready to close, so that column is the one to mark.
  const [isDraggedQuoteAccepted, setIsDraggedQuoteAccepted] = useState(false);

  const allowedTarget = draggedDeal && quickMoveStageOf(draggedDeal, isDraggedQuoteAccepted);

  const startDrag = (deal: Deal) => {
    setDraggedDeal(deal);
    setIsDraggedQuoteAccepted(false);
    if (deal.stage === "QUOTATION") void hasAcceptedQuote(deal.id).then(setIsDraggedQuoteAccepted);
  };

  const endDrag = () => {
    setDraggedDeal(null);
    setHoveredStage(null);
  };

  const dropOnStage = (targetStage: DealStage) => {
    if (draggedDeal && targetStage !== draggedDeal.stage) onMove(draggedDeal, targetStage);
    endDrag();
  };

  return (
    <div className="scroll-thin -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-4 md:snap-none md:-mx-4 md:px-4">
      {STAGES.map((stage, stageIndex) => {
        const stageDeals = deals.filter((deal) => deal.stage === stage.id);
        const isAllowedTarget = allowedTarget === stage.id;
        const isDimmed = draggedDeal !== null && !isAllowedTarget && stage.id !== draggedDeal.stage;
        return (
          <section
            key={stage.id}
            onDragOver={(event) => {
              event.preventDefault();
              if (hoveredStage !== stage.id) setHoveredStage(stage.id);
            }}
            onDrop={(event) => {
              event.preventDefault();
              dropOnStage(stage.id);
            }}
            className={`flex w-[82vw] shrink-0 snap-start flex-col sm:w-[280px] rounded-[1.75rem] border border-white/60 bg-white/30 p-2.5 backdrop-blur-xl transition-all duration-500 hover:bg-white/45 ${isDimmed ? "opacity-45" : ""} ${
              isAllowedTarget ? `outline-2 outline-dashed outline-black ${hoveredStage === stage.id ? "bg-white" : "bg-white/70"}` : ""
            }`}
          >
            <header className="mb-3 flex items-center justify-between px-2.5 pt-1.5">
              <h2 className="text-sm font-semibold">{stage.label}</h2>
              <span className="grid h-6 min-w-6 place-items-center rounded-full bg-black px-2 text-xs font-semibold text-white tabular-nums transition-transform hover:scale-110">{stageDeals.length}</span>
            </header>
            <div className="flex min-h-24 flex-col gap-2.5">
              {stageDeals.map((deal, dealIndex) => {
                const quickMoveStage = quickMoveStageOf(deal);
                return (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    ownerName={ownerName(deal.owner_user_id)}
                    requests={requestsByDeal.get(deal.id)}
                    index={stageIndex + dealIndex}
                    isDragging={draggedDeal?.id === deal.id}
                    quickMoveStage={quickMoveStage}
                    onQuickMove={() => quickMoveStage && onMove(deal, quickMoveStage)}
                    onDragStart={() => startDrag(deal)}
                    onDragEnd={endDrag}
                  />
                );
              })}
              {stageDeals.length === 0 && (
                <p className="rounded-2xl border border-dashed border-neutral-300 py-8 text-center text-xs text-neutral-400 transition-colors hover:border-neutral-500 hover:text-neutral-600">{isAllowedTarget ? "Drop here" : "No deals"}</p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
