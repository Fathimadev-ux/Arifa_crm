"use client";

import { Bot } from "lucide-react";
import { useState } from "react";
import { can } from "@/config/roles";
import { LOST_REASONS, type LostReason, isClosedStage, nextStageOf, stageLabel } from "@/config/stages";
import { type DealDetail, moveDeal, reassignDeal, reopenDeal, setAiEnabled } from "@/lib/api/crm";
import { formatRelative, humanize } from "@/lib/format";
import { useStaffNames } from "@/hooks/useStaffNames";
import { useSession } from "@/store/session";
import { Avatar, Button, enterDelay } from "@/components/ui";

const FIELD = "glass h-10 rounded-full px-4 text-sm shadow-sm outline-none transition-shadow placeholder:text-neutral-400 focus:border-black focus:shadow-md";

/** A small inline form: one text field, a confirm and a cancel. */
function InlineForm({ children, canSubmit, submitLabel, onSubmit, onCancel }: { children: React.ReactNode; canSubmit: boolean; submitLabel: string; onSubmit: () => void; onCancel: () => void }) {
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
    >
      {children}
      <Button type="submit" disabled={!canSubmit}>
        {submitLabel}
      </Button>
      <Button type="button" variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </form>
  );
}

/** Move forward, mark lost (with a reason from the list), or reopen a lost deal (manager / MD). */
export function StageActions({ deal }: { deal: DealDetail }) {
  const { role } = useSession();
  const [mode, setMode] = useState<"IDLE" | "LOST" | "REOPEN">("IDLE");
  const [lostReason, setLostReason] = useState<LostReason | "">("");
  const [text, setText] = useState("");

  const close = () => {
    setMode("IDLE");
    setLostReason("");
    setText("");
  };

  if (mode === "LOST") {
    return (
      <InlineForm canSubmit={lostReason !== ""} submitLabel="Mark lost" onCancel={close} onSubmit={() => void moveDeal(deal, "LOST", { reason: lostReason as LostReason, note: text.trim() }).then(close)}>
        <select autoFocus value={lostReason} onChange={(event) => setLostReason(event.target.value as LostReason)} aria-label="Reason" className={FIELD}>
          <option value="">Reason</option>
          {LOST_REASONS.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.label}
            </option>
          ))}
        </select>
        <input value={text} onChange={(event) => setText(event.target.value)} placeholder="Note (optional)" className={`${FIELD} w-56`} />
      </InlineForm>
    );
  }

  if (mode === "REOPEN") {
    return (
      <InlineForm canSubmit={text.trim() !== ""} submitLabel="Reopen" onCancel={close} onSubmit={() => void reopenDeal(deal, text.trim()).then(close)}>
        <input autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="Reason" className={`${FIELD} w-64`} />
      </InlineForm>
    );
  }

  if (deal.stage === "LOST") {
    return can(role, "REOPEN_DEALS") ? <Button onClick={() => setMode("REOPEN")}>Reopen</Button> : null;
  }
  if (isClosedStage(deal.stage)) return null;

  const nextStage = nextStageOf(deal.stage);
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => setMode("LOST")}>
        Mark lost
      </Button>
      {nextStage && <Button onClick={() => void moveDeal(deal, nextStage)}>Move to {stageLabel(nextStage)}</Button>}
    </div>
  );
}

/** Owner name; manager and MD can reassign to another salesperson right here. */
export function OwnerValue({ deal }: { deal: DealDetail }) {
  const { role } = useSession();
  const { nameOf, staff } = useStaffNames();
  const owner = nameOf(deal.owner_user_id);
  const salespeople = staff?.filter((member) => member.role === "sales" && member.is_active) ?? [];

  if (!can(role, "REASSIGN_DEALS") || salespeople.length === 0) {
    return (
      <span className="flex items-center gap-2">
        <Avatar name={owner} /> {owner}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <Avatar name={owner} />
      <select
        value={deal.owner_user_id ?? ""}
        onChange={(event) => {
          const member = salespeople.find((item) => item.id === event.target.value);
          if (member) void reassignDeal(deal, member.id, member.full_name);
        }}
        aria-label="Reassign owner"
        className="-ml-1 min-w-0 cursor-pointer rounded-full bg-transparent px-2 font-semibold outline-none transition-colors hover:bg-black/5"
      >
        {!deal.owner_user_id && <option value="">Unassigned</option>}
        {salespeople.map((member) => (
          <option key={member.id} value={member.id}>
            {member.full_name}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Who is talking to the buyer, the AI's summary, and (manager / MD) take over or hand back. */
export function AiCard({ deal, now }: { deal: DealDetail; now: number | null }) {
  const { role } = useSession();
  // A stop from the buyer can never be lifted from here (§8.1).
  const canToggle = can(role, "TOGGLE_AI") && !isClosedStage(deal.stage) && deal.ai_paused_reason !== "opt_out";

  return (
    <div className="group animate-enter lift panel-dark space-y-4 p-5" style={enterDelay(3)}>
      <div className="flex items-center gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-black transition-transform duration-300 group-hover:scale-110 group-hover:rotate-[-10deg]">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-neutral-400">AI</p>
          <p className="mt-0.5 text-lg font-light tracking-tight">{deal.ai_enabled ? "On" : `Paused${deal.ai_paused_reason ? ` · ${humanize(deal.ai_paused_reason)}` : ""}`}</p>
        </div>
        {canToggle && (
          <button onClick={() => void setAiEnabled(deal, !deal.ai_enabled)} className="press shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200">
            {deal.ai_enabled ? "Take over" : "Hand back"}
          </button>
        )}
      </div>
      {deal.ai_summary && (
        <div className="border-t border-white/15 pt-4">
          <p className="text-sm leading-relaxed text-neutral-200">{deal.ai_summary}</p>
          {deal.ai_summary_at && now !== null && <p className="mt-2 text-xs text-neutral-500">{formatRelative(deal.ai_summary_at, now)}</p>}
        </div>
      )}
    </div>
  );
}
