import type { DealStage, Schemas } from "@/lib/api/client";

export type LostReason = NonNullable<Schemas["StageMoveIn"]["lost_reason"]>;

export const STAGES: { id: DealStage; label: string }[] = [
  { id: "NEW", label: "New" },
  { id: "QUALIFIED", label: "Qualified" },
  { id: "QUOTATION", label: "Quotation" },
  { id: "NEGOTIATION", label: "Negotiation" },
  { id: "READY_TO_CLOSE", label: "Ready to close" },
  { id: "PAYMENT", label: "Payment" },
  { id: "WON", label: "Won" },
  { id: "LOST", label: "Lost" },
];

export const LOST_REASONS: { id: LostReason; label: string }[] = [
  { id: "price_too_high", label: "Price too high" },
  { id: "delivery_not_suitable", label: "Delivery not suitable" },
  { id: "bought_competitor", label: "Bought from a competitor" },
  { id: "product_unavailable", label: "Product unavailable" },
  { id: "no_response_postponed", label: "No response / postponed" },
  { id: "budget", label: "Budget" },
  { id: "duplicate", label: "Duplicate" },
  { id: "opted_out", label: "Opted out" },
  { id: "other", label: "Other" },
];

/** The normal order a deal moves in. LOST can happen from any open stage. */
const STAGE_FLOW: DealStage[] = ["NEW", "QUALIFIED", "QUOTATION", "NEGOTIATION", "READY_TO_CLOSE", "PAYMENT", "WON"];

export function stageLabel(stage: DealStage): string {
  return STAGES.find((item) => item.id === stage)?.label ?? stage;
}

export function lostReasonLabel(reason: string): string {
  return LOST_REASONS.find((item) => item.id === reason)?.label ?? reason;
}

export function nextStageOf(stage: DealStage): DealStage | null {
  const position = STAGE_FLOW.indexOf(stage);
  return position === -1 || position === STAGE_FLOW.length - 1 ? null : STAGE_FLOW[position + 1];
}

export function isClosedStage(stage: DealStage): boolean {
  return stage === "WON" || stage === "LOST";
}
