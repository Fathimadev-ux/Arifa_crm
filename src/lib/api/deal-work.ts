"use client";

/** The deal page's day-to-day work (§11, §14, §15): quotes, talking to the buyer, stops, takeover, orders. */
import { ApiError, api, unwrap, type Schemas } from "./client";
import { type Deal, afterDealChange, dealPath, runAction } from "./crm";
import { revalidate, useApi } from "./use-api";

export type QuoteEdits = Schemas["QuoteEditsIn"];
export type ManualQuote = Schemas["ManualQuoteIn"];
export type Order = Schemas["OrderRow"];
export type OrderStatus = Schemas["OrderStatusIn"]["status"];
export type OptOut = Schemas["OptOutIn"];
export type MessageChannel = NonNullable<Schemas["StaffMessageIn"]["channel"]>;

export const INCOTERMS = ["EXW", "FCA", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DDP"] as const;

/** A fresh key per send, so a double tap reaches the buyer once (CRM_API.md §2). */
const newClientKey = () => crypto.randomUUID();
const afterQuoteChange = (dealId: string) => [...afterDealChange(dealId), "approvals"];

export const useQuoteVersion = (id: string | null) => useApi(id ? `quote:${id}` : null, async () => unwrap(await api.GET("/v1/quote-versions/{version_id}", { params: { path: { version_id: id! } } })));

/** §11.3 "Edit then approve": only the changed fields; below the minimum goes to the manager first. */
export function reviseQuote(dealId: string, edits: QuoteEdits) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/quotes/revise", { ...dealPath(dealId), body: edits })), "Revised quote sent for approval", afterQuoteChange(dealId));
}

/** D8: a custom or unpriced item priced by hand, then approved as usual. */
export function createManualQuote(dealId: string, quote: ManualQuote) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/quotes/manual", { ...dealPath(dealId), body: quote })), "Manual quote sent for approval", afterQuoteChange(dealId));
}

export type SendResult = "sent" | "window_closed" | "failed";

/**
 * §14: reply to the buyer on the same channel and company number. WhatsApp's 24-hour window may be closed:
 * the caller then offers the re-open message (`reopenTemplate`). Other refusals are toasted by runAction.
 */
export async function sendMessage(dealId: string, text: string, channel: MessageChannel | null, reopenTemplate = false): Promise<SendResult> {
  let windowClosed = false;
  const result = await runAction(
    async () => {
      try {
        return unwrap(await api.POST("/v1/deals/{deal_id}/messages", { ...dealPath(dealId), body: { text, channel, client_key: newClientKey(), reopen_template: reopenTemplate } }));
      } catch (error) {
        if (error instanceof ApiError && error.reason === "window_closed") windowClosed = true;
        throw error;
      }
    },
    reopenTemplate ? "Re-open message sent" : "Message sent",
    [`deal:${dealId}`],
  );
  return result ? "sent" : windowClosed ? "window_closed" : "failed";
}

/** §14 click-to-call: the salesperson's phone rings first, then the buyer's. */
export function callBuyer(dealId: string) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/call", { ...dealPath(dealId), body: { client_key: newClientKey() } })), "Calling: your phone rings first", [`deal:${dealId}`]);
}

/** §8.1 step 4: record a stop the buyer asked for. It can never be removed here. */
export function recordOptOut(dealId: string, optOut: OptOut) {
  return runAction(async () => unwrap(await api.POST("/v1/deals/{deal_id}/opt-out", { ...dealPath(dealId), body: optOut })), "Stop recorded: no more messages to this buyer", afterDealChange(dealId));
}

/** §3: the MD takes the deal over (the salesperson is read-only), or hands it back. */
export function setTakeover(deal: Deal, takeOver: boolean) {
  return runAction(
    async () => unwrap(await (takeOver ? api.POST("/v1/deals/{deal_id}/takeover", dealPath(deal.id)) : api.POST("/v1/deals/{deal_id}/handback", dealPath(deal.id)))),
    takeOver ? `You took over ${deal.number}` : `${deal.number} handed back`,
    afterDealChange(deal.id),
  );
}

/** The order of a won deal (the orders list is filtered here: the API has no per-deal order read). */
export const useDealOrder = (dealId: string, isWon: boolean) =>
  useApi(isWon ? `orders:${dealId}` : null, async () => unwrap(await api.GET("/v1/orders", { params: { query: { limit: 100 } } })).items.find((order) => order.deal_id === dealId) ?? null);

/** §15.3 order tracking: ready → shipped → delivered. */
export function updateOrderStatus(order: Order, status: OrderStatus, trackingRef?: string) {
  return runAction(
    async () => {
      const result = unwrap(await api.PATCH("/v1/deals/orders/{order_id}", { params: { path: { order_id: order.id } }, body: { status, tracking_ref: trackingRef || null } }));
      revalidate(`orders:${order.deal_id}`, "orders:list");
      return result;
    },
    `Order ${order.number}: ${status}`,
    [`deal:${order.deal_id}`],
  );
}
