"use client";

import { Phone, Send } from "lucide-react";
import { useState } from "react";
import type { DealDetail } from "@/lib/api/crm";
import { type MessageChannel, type OptOut, callBuyer, recordOptOut, sendMessage } from "@/lib/api/deal-work";
import { FormCard, Select, TEXTAREA, TextArea } from "@/components/forms";
import { Button, Section } from "@/components/ui";

const OPT_OUT_SCOPES = [
  { value: "all", label: "Everything" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Calls" },
] as const;

const MESSAGE_MAX = 4000;

/** Records a stop the buyer asked for (§8.1 step 4). Add only: a stop is never removed here. */
function OptOutForm({ dealId, onClose }: { dealId: string; onClose: () => void }) {
  const [words, setWords] = useState("");
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState<OptOut["scope"]>("all");

  return (
    <FormCard
      title="Record a stop"
      submitLabel="Record stop"
      canSubmit={words.trim() !== ""}
      onSubmit={() => void recordOptOut(dealId, { words: words.trim(), reason: reason.trim() || null, scope }).then((result) => result && onClose())}
      onCancel={onClose}
    >
      <TextArea label="What the buyer said" autoFocus value={words} onChange={(event) => setWords(event.target.value)} maxLength={2000} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select label="Stop" value={scope} onChange={(event) => setScope(event.target.value as OptOut["scope"])} options={OPT_OUT_SCOPES} />
        <TextArea label="Their reason, if they gave one" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} rows={1} />
      </div>
    </FormCard>
  );
}

/**
 * §14 after hand-over: reply on the same channel and company number, or click-to-call (the salesperson's phone
 * rings first). When WhatsApp's 24-hour window has closed, the re-open template is offered instead.
 */
export function BuyerConversation({ deal }: { deal: DealDetail }) {
  const { contact } = deal;
  const channels: { value: MessageChannel; label: string }[] = [
    ...(contact.whatsapp_e164 ? [{ value: "whatsapp" as const, label: "WhatsApp" }] : []),
    ...(contact.email ? [{ value: "email" as const, label: "Email" }] : []),
  ];
  const [channel, setChannel] = useState<MessageChannel | null>(contact.preferred_channel === "email" && contact.email ? "email" : (channels[0]?.value ?? null));
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isWindowClosed, setIsWindowClosed] = useState(false);
  const [isRecordingStop, setIsRecordingStop] = useState(false);

  if (deal.opted_out_at) {
    return (
      <Section title="Buyer" index={4}>
        <p className="text-sm text-neutral-500">The buyer asked to stop. Messages and calls to them are blocked.</p>
      </Section>
    );
  }

  const send = async (reopenTemplate: boolean) => {
    setIsSending(true);
    const result = await sendMessage(deal.id, reopenTemplate ? "" : text.trim(), channel, reopenTemplate);
    setIsSending(false);
    setIsWindowClosed(result === "window_closed");
    if (result === "sent" && !reopenTemplate) setText("");
  };

  return (
    <Section title="Buyer" index={4}>
      {isRecordingStop ? (
        <OptOutForm dealId={deal.id} onClose={() => setIsRecordingStop(false)} />
      ) : (
        <div className="space-y-3">
          {channels.length > 0 && (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (text.trim()) void send(false);
              }}
            >
              <textarea value={text} onChange={(event) => setText(event.target.value)} rows={3} maxLength={MESSAGE_MAX} placeholder="Reply to the buyer" aria-label="Reply to the buyer" className={TEXTAREA} />
              {isWindowClosed && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-black px-4 py-3 text-sm text-white">
                  <span>WhatsApp&apos;s 24-hour window has closed.</span>
                  <button type="button" disabled={isSending} onClick={() => void send(true)} className="press rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200">
                    Send the re-open message
                  </button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {channels.length > 1 && (
                  <select value={channel ?? ""} onChange={(event) => setChannel(event.target.value as MessageChannel)} aria-label="Channel" className="glass h-10 rounded-full px-4 text-sm shadow-sm outline-none">
                    {channels.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                <Button type="submit" disabled={!text.trim() || isSending}>
                  <Send className="size-4" /> {isSending ? "Sending…" : "Send"}
                </Button>
                {contact.phone_e164 && (
                  <Button type="button" variant="secondary" onClick={() => void callBuyer(deal.id)}>
                    <Phone className="size-4" /> Call
                  </Button>
                )}
              </div>
            </form>
          )}
          <button onClick={() => setIsRecordingStop(true)} className="press rounded-full px-3 py-1.5 text-xs font-medium text-neutral-500 hover:bg-black/5 hover:text-black">
            Buyer asked to stop?
          </button>
        </div>
      )}
    </Section>
  );
}
