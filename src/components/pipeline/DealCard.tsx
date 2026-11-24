"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import type { DragEvent } from "react";
import { isClosedStage, stageLabel } from "@/config/stages";
import type { DealRequests } from "@/lib/api/change-requests";
import type { DealStage } from "@/lib/api/client";
import type { Deal } from "@/lib/api/crm";
import { formatRelative } from "@/lib/format";
import { useNow } from "@/hooks/useNow";
import { Avatar, DealFlag, enterDelay } from "@/components/ui";
import { LAYOUT_SPRING } from "@/config/motion";

interface DealCardProps {
  deal: Deal;
  ownerName: string;
  /** The customer's change requests on this deal (open count, or one resolved). */
  requests?: DealRequests;
  index: number;
  isDragging: boolean;
  /** The stage this deal can move to right now, or null when it is blocked. */
  quickMoveStage: DealStage | null;
  onQuickMove: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export function DealCard({ deal, ownerName, requests, index, isDragging, quickMoveStage, onQuickMove, onDragStart, onDragEnd }: DealCardProps) {
  const now = useNow();
  const isOverdue = now !== null && deal.next_action_at !== null && new Date(deal.next_action_at).getTime() < now;

  return (
    <motion.div
      layout
      layoutId={deal.id}
      transition={LAYOUT_SPRING}
      animate={{ opacity: isDragging ? 0.4 : 1, scale: isDragging ? 0.97 : 1 }}
      className="group relative"
    >
      <Link
        href={`/deals/${deal.id}`}
        draggable
        onDragStart={(event: DragEvent) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
        style={enterDelay(index)}
        className="animate-enter block cursor-grab rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur-md transition-[box-shadow,translate] duration-500 group-hover:-translate-y-0.5 group-hover:shadow-lg active:cursor-grabbing"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm leading-snug font-semibold">{deal.number}</p>
          <DealFlag deal={deal} />
        </div>
        {requests && requests.open > 0 ? (
          <span className="mt-2 inline-block rounded-full bg-black px-2.5 py-0.5 text-[10px] font-semibold text-white">
            {requests.open} open {requests.open === 1 ? "request" : "requests"}
          </span>
        ) : (
          requests?.isResolved && !isClosedStage(deal.stage) && <span className="mt-2 inline-block rounded-full border border-neutral-300 px-2.5 py-0.5 text-[10px] font-medium text-neutral-600">Request resolved</span>
        )}
        <p className={`mt-1 text-xs ${isOverdue ? "font-medium text-black" : "text-neutral-500"}`}>
          {deal.next_action_at && now !== null ? `${isOverdue ? "Overdue" : "Next"} ${formatRelative(deal.next_action_at, now)}` : "No next action"}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-dashed border-neutral-200 pt-3">
          <span className="truncate text-xs text-neutral-500">{ownerName}</span>
          <span className={`transition-opacity ${quickMoveStage ? "group-hover:opacity-0" : ""}`}>
            <Avatar name={ownerName} />
          </span>
        </div>
      </Link>

      {/* Quick action: appears on hover, sits where the owner avatar is. */}
      {quickMoveStage && (
        <button
          onClick={onQuickMove}
          className="press absolute right-3.5 bottom-3.5 flex items-center gap-1 rounded-full bg-black px-3 py-1 text-[11px] font-semibold text-white opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:opacity-100 hover:bg-neutral-800 focus-visible:opacity-100"
          aria-label={`Move ${deal.number} to ${stageLabel(quickMoveStage)}`}
        >
          {stageLabel(quickMoveStage)} <ArrowRight className="size-3" />
        </button>
      )}
    </motion.div>
  );
}
