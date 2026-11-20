# Frontend guide: connecting the Arifa Pack website to the Kairox backend

For the developer of the Arifa Pack website (Next.js, `Arifa-Pack` repo). It lists, in order, what to change so
that the site reads its content from the CMS and the assistant moves the page, takes contact details with
consent and turns visitors into leads. Every step ends with a check you can run yourself. Read alongside
`WEBSITE_API.md` (the assistant), `CMS_API.md` (content) and the two Postman collections `Kairox-Website` and
`Kairox-CMS`.

Status of the site this guide was checked against: commit `0e160eb` (19 Nov). It already talks to the
backend (`src/lib/arifaApi.ts`: sessions, messages, voice, identify) and has product pages. The live test of
20 Nov ran that code against the real backend: what works and what is missing is in `WEBSITE_API.md` §5.

---

## 0. Environment

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_ARIFA_API_URL` | `https://api.arifapack.com` (production), `http://localhost:38000` (the live test stack), `http://localhost:4011` (mock) | already used by `arifaApi.ts` |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | the Cloudflare Turnstile site key | empty only against a local backend |
| `KX_REVALIDATE_SECRET` (server only) | the same value as the backend's `KX_APP_WEBSITE_REVALIDATE_SECRET` | for `/api/revalidate` (step 2) |
| `NEXT_PUBLIC_MEDIA_URL` | the R2 public URL of the media bucket | for the image loader (step 2) |

The backend must list the site's origin in `KX_APP_CORS_PUBLIC_ORIGINS`. Call `/v1/public/*` and
`/v1/content/*` from the browser **without credentials** (the session token goes in `Authorization`).

Mock without a backend: `npx @stoplight/prism-cli mock docs/handoff/openapi/openapi-website.json --port 4011`
(and `openapi-cms.json` on another port).

**Check:** Postman `Kairox-Website` → *Start a session* returns `201` from your machine.

---

## 1. Send the visitor's place, and do the assistant's actions

This is the change with the most effect: the assistant then knows the page and moves it.
`website-adapter/arifa-site-actions.patch` is the exact change the live test ran (5 files, about 50 lines):

1. `src/lib/arifaApi.ts`: the `SiteAction` type, `actions?` on `MessageOut`, and `siteContext()` (path, page,
   locale, family filter, product page, quick view). Send `context: siteContext()` with every message.
2. `src/assistant/brain.ts`: `toAction(r.actions)` maps the backend's actions onto the site's own:
   `show_family` → `family`, `show_product` → `product` (by its ref, from `catalogue.json`), `fill_enquiry` →
   `quote`, `factory_tour` → `factory`, `navigate` / `scroll_to` → a new `navigate` action.
3. `src/assistant/assistant.ts` `act()`: `navigate` goes to the path of the page's locale.

```bash
git apply path/to/arifa-site-actions.patch
```

Then:
* do each action `id` once (the instant layer and the AI may send the same intent);
* use `resolved.path_ar` on Arabic pages, `resolved.path_en` otherwise;
* run the actions one after another, and stop the queue when the visitor scrolls or clicks.

**Check (live test 20 Nov):** "show me kitchen foil" on the home page opens `/products?family=foil`; "do you
have 8325?" opens the 8325 quick view; "where are your certificates?" goes to `/quality#documents`; Arabic
"أرني حاويات ألمنيوم" on `/ar` opens the containers in Arabic. Test cases for every phrase:
`vectors/site-nav.json`.

---

## 2. Stream the turn (the page moves in under a fifth of a second)

With the JSON answer the page moves only when the whole reply is written (3 to 19 s in the live test). With
`Accept: text/event-stream` the first `action` event arrives in 15 to 150 ms:

```ts
const r = await fetch(`${BASE}/v1/public/sessions/${id}/messages`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'text/event-stream', authorization: `Bearer ${token}` },
  body: JSON.stringify({ text, language, context: siteContext() }),
});
const reader = r.body!.pipeThrough(new TextDecoderStream()).getReader();
let buf = '';
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += value;
  let i;
  while ((i = buf.indexOf('\n\n')) >= 0) {
    const block = buf.slice(0, i); buf = buf.slice(i + 2);
    const event = /^event: (.*)$/m.exec(block)?.[1];
    const data = JSON.parse(/^data: (.*)$/m.exec(block)?.[1] || '{}');
    if (event === 'action') queueAction(data);          // move the page now
    else if (event === 'delta') appendToBubble(data.text); // the reply, a sentence at a time
    else if (event === 'done') finish(data);             // { language, handed_over }
    else if (event === 'error') showError(data);         // { status, code, message }: as WEBSITE_API.md §4
  }
}
```

**Check:** in the browser's network tab the first `event: action` arrives before any `delta`.

---

## 3. A text box in the assistant panel

The panel has the microphone and suggestion chips only. A visitor without a microphone (on a laptop, in an
office, or who prefers to type) cannot ask anything. The design (AS-02) and accessibility (§9) both ask for a
text box. Add an input under the chat log; on Enter, show the bubble and call the same `handle(text)` the
microphone's final transcript uses. While a voice call is on, send the typed text on the LiveKit data channel
instead (`kx.chat.in`, step 6), so voice and text stay one conversation.

**Check:** type "show me cling film" and press Enter: the page opens the cling film family.

---

## 4. The enquiry desk sends to the backend (instead of `mailto:`)

`POST /v1/public/enquiries` with the desk's own field names: `family[]`, `products[]` (the enquiry list),
`detail`, `size`, `quantity`, `often`, `region`, `city`, `name`, `company`, `trade`, `channel`, `email`,
`phone`, `extra`, `message`, `locale`, `whatsapp_opt_in`, `email_opt_in`, `consent_wording`. With an open chat,
also `session_id` and the session token (the enquiry joins the same deal); without one, a Turnstile token. A
phone or an email is required (`422 reason: "empty"`). Show the `reference` from the answer: "We have your
enquiry (W-3F9A2C)".

The two consent ticks are separate, never pre-ticked, and `consent_wording` is the exact sentence next to them
(the CRM keeps it as the proof of consent, SRS §8 / §22).

**Check:** Postman `Kairox-Website` → *Enquiry desk*; in the CRM the deal shows the note "Website enquiry
(Contact page)" with English labels and a salesperson.

---

## 5. The contact card and the nudges

* When an `ask_contact` action arrives, show a small card in the chat: name, phone, email, and the two ticks
  ("Send my quotation on WhatsApp", "Send it by email"). Send it with `POST /v1/public/sessions/{id}/contact`.
  The answer is always `{ok: true}` (it never reveals whether the person was known).
* Send `POST /v1/public/sessions/{id}/events` when the visitor moves: `page_view` and `product_open` (just to
  keep the place), `product_dwell` with `seconds` after 20 s on a product, `enquiry_add` when they add to the
  enquiry list, `idle` with `seconds` after 45 s without a move on Contact. When the answer has a `reply`, show
  it as an assistant message and do its `actions`. The backend decides (at most 3 per visit, never before the
  visitor has written or spoken).

**Check:** chat once, then stay 25 s on a product: the assistant offers the product's sizes and packing.

---

## 6. Voice: actions and captions on the LiveKit data channel

`voiceRoom()` already joins the room. Add a listener and two senders (`livekit-client`):

```ts
room.on(RoomEvent.DataReceived, (payload, _participant, _kind, topic) => {
  const data = JSON.parse(new TextDecoder().decode(payload));
  if (topic === 'kx.site.actions') queueAction(data);      // the same actions as the chat
  else if (topic === 'kx.captions') showCaption(data);     // { role: 'visitor' | 'assistant', text, final }
});
const send = (topic: string, data: unknown) =>
  room.localParticipant.publishData(new TextEncoder().encode(JSON.stringify(data)), { reliable: true, topic });
send('kx.site.context', siteContext());                    // when the visitor moves during a call
send('kx.chat.in', { text, context: siteContext() });      // typed during a call: answered in the call
```

Keep the room connection in the root layout and navigate with `router.push`, so a call survives a page
change. If a full page load happens, join the same room again: the recording notice is not repeated and the
assistant does not greet again.

**Check:** in a call, say "show me cling film": the family opens before the assistant finishes its sentence,
and the captions show both sides.

---

## 7. Content from the CMS

Replace the static data with the content API (`CMS_API.md` has every field):

| Today | From the CMS |
|---|---|
| `src/data/catalogue.json` | `GET /v1/content/families`, `/v1/content/products?family=`, `/v1/content/products/{id}` (also previous / next / more from the family) |
| `src/data/site.ts` | `GET /v1/content/site` (contacts, hours, social, theme colours and fonts, the assistant's texts) |
| `src/data/clients.json` | `GET /v1/content/collections/clients`, `industries`, `stories` |
| page sections | `GET /v1/content/pages/{slug}` (one block per section id; the ids are a contract with the assistant) |
| `sitemap.ts`, the old-site redirects | `GET /v1/content/sitemap`, `GET /v1/content/redirects` |

Fetch with `next: { tags: [...] }` and a 60 s fallback (`revalidate: 60`). Add `src/app/api/revalidate/route.ts`:
check `X-Kx-Signature: sha256=HMAC(secret, X-Kx-Timestamp + "." + body)` (reject a timestamp older than 5
minutes), then `revalidateTag` / `revalidatePath` for the `tags` and `paths` in the body; repeat the same
`event_id` safely. Preview: the admin's link opens `/api/draft?token=…`; in draft mode add `?preview=<token>`
to the content calls. Images: a `next/image` loader on `NEXT_PUBLIC_MEDIA_URL` (content-addressed: a new image
is a new URL, so caches never serve an old one).

```ts
// src/app/api/revalidate/route.ts
import crypto from 'node:crypto';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: Request) {
  const ts = req.headers.get('x-kx-timestamp') || '';
  const sig = req.headers.get('x-kx-signature') || '';
  const body = await req.text();
  const want = 'sha256=' + crypto.createHmac('sha256', process.env.KX_REVALIDATE_SECRET!).update(`${ts}.${body}`).digest('hex');
  const fresh = Math.abs(Date.now() / 1000 - Number(ts)) <= 300;
  const same = sig.length === want.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want));
  if (!fresh || !same) return new Response('bad signature', { status: 401 });
  const { tags = [], paths = [] } = JSON.parse(body);
  tags.forEach((t: string) => revalidateTag(t));
  paths.forEach((p: string) => revalidatePath(p));
  return Response.json({ ok: true }); // the same event_id twice is harmless
}
```

The section ids the assistant scrolls to must stay as they are (`CMS_API.md` §3). On the home page the factory
film section is `floor` (the nav links `/#floor`); the assistant's `goFactory()` uses `#factory`, the press
section. Keep both ids, and use `floor` for the film.

**Check:** change a product's name in the CMS and publish: the product page shows it within a minute, and the
assistant uses the new name.

---

## 8. Check-list

| # | Done when | Prove it with |
|---|---|---|
| 1 | context sent, actions done | the four phrases in step 1 move the page |
| 2 | SSE | the first `action` event comes before the first `delta` |
| 3 | text box | typing works without a microphone |
| 4 | enquiry desk | Postman *Enquiry desk*; the CRM deal has the English note |
| 5 | contact card, nudges | the card's consent appears in the CRM; a nudge after 25 s on a product |
| 6 | voice data channel | page moves and captions during a call |
| 7 | CMS content, revalidate, preview, images | a published change shows within a minute |
| 8 | Arabic | the same checks on `/ar` pages (paths from `resolved.path_ar`) |
