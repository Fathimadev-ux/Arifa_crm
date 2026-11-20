# Website API: frontend hand-off

For the developer building the **public website** (Next.js on Vercel, the 3D "Enter the factory" experience)
against a mock first. Taken from the code (`packages/kx-agent-framework/src/kx/agents/website/router.py`,
`kx/agents/website/service.py`, `kx/agents/voice/bridge.py`) and the SRS §6 (website flow), §8 (qualification), §8.1 (opt-out), D34/D36/D39. The
endpoint reference in the second half is **generated from the code**.

Companion files: `openapi-website.json` (OpenAPI 3.1 of these endpoints), `CMS.md` (where the page content
comes from), `CRM_API.md` (staff app).

---

## 1. Working against a mock

```bash
npx @stoplight/prism-cli mock docs/handoff/openapi/openapi-website.json --port 4011
```

Things a mock cannot do: the Turnstile check, the real AI reply, the LiveKit room. Real API locally:
`make up && kx migrate && kx api` (base URL `http://localhost:8000`). Locally the Turnstile check is skipped
when no secret is configured; staging and production refuse to start without it.

CORS (security review M2, 19 Nov): the website's origin is listed in `KX_APP_CORS_PUBLIC_ORIGINS`, not in
`KX_APP_CORS_ORIGINS` (that one is for the CRM screens only). The website may call `/v1/public/*` and nothing
else, **without credentials**: use `fetch(url, {headers: {Authorization: "Bearer <session token>"}})`, never
`credentials: "include"`. Staff routes give the website's origin no CORS access, and `/v1/auth/*` answers it
with `403`.

---

## 2. What the website does with the API (core design)

The site shows CMS content (pages, categories, products, FAQs, certificates, the factory tour; see `CMS.md`)
and hosts the AI assistant. The assistant is the **same AI as on WhatsApp and email**: same rules, same price
guard, and it never states a price that is not in an approved quote (prices never appear on the website,
§7). The conversation becomes a deal in the CRM.

SRS §6 journey and the calls behind it:

| Step (§6) | What the site does |
|---|---|
| 1 Landing: one button **Enter the factory** = consent to voice; the chat icon is always available | On *Enter the factory*: `POST /v1/public/sessions` with `voice_consent: true`. On opening the chat: the same call with `voice_consent: false` (unless a session already exists). Both need the Turnstile token. |
| 1 Recording notice | Played by the voice agent itself as the first thing it says ("This conversation is with our AI assistant and may be recorded ..."); the site does not play it. |
| 2 Guided tour, 3 Language | Chat: `POST /v1/public/sessions/{id}/messages`. Voice: `POST /v1/public/sessions/{id}/voice`, then join the LiveKit room. Send the visitor's language when they switch (`language` on a message). |
| 4 Qualification | Happens inside the conversation; no form is required. |
| 5 Requirement Summary, 6 Hand-over | The backend sends the summary PDF to WhatsApp or email. When `handed_over` comes back `true`, show "Our sales team is preparing your quotation; you'll receive it on WhatsApp shortly." |
| 7 Returning visitors | Only after they identify themselves: `POST /v1/public/sessions/{id}/identify` with the phone or email they typed. Never recognise anyone silently (no cookies matching, no pre-filled names). |

Languages: English, Arabic, Hindi, Tamil, Chinese, Sinhala (`en`, `ar`, `hi`, `ta`, `zh`, `si`). **Sinhala is
text-only**: `voice_available` is `false` for `si`, so hide the voice button and keep the chat.

---

## 2a. The assistant moves the page (D55, D57)

The assistant never reads the site's HTML. It knows the site from the **site map** the CMS builds
(`GET /v1/content/manifest`: pages and their section ids, the 8 families with their words in English and
Arabic, the 78 products, the 7 tour chapters). The site tells it **where the visitor is** (`context`, below)
and it answers with **site actions**: what to show, never how. The site animates each action with the
functions it already has.

| Action (`type`) | Fields | What the site does (existing code in `assistant.ts`) |
|---|---|---|
| `show_family` | `family` (containers, foil, platters, cups-trays, pots, microwave, cutlery, cling-film) | `showFamily(fam(id))` |
| `show_product` | `product_id` (e.g. `ac-8325`), `view` (`quick` or `page`) | `showProduct(ref)` (quick view), or the product page `/products/<id>` |
| `navigate` | `page` (home, products, about, quality, clients, contact), `section?` (a DOM id) | go to `resolved.path_en` / `path_ar` (the page's locale) |
| `scroll_to` | `section` (a DOM id on this page) | `lenis.scrollTo('#' + section)` |
| `factory_tour` | `chapter?` (arrival, forming, lids, foil, packing, moulding, warehouse), `seconds?` | `goFactory()`, then seek the film to `seconds` |
| `add_to_enquiry` | `product_ids[]` | add them to the enquiry list |
| `fill_enquiry` | `fill` with the desk's own field names (`family[]`, `detail`, `size`, `quantity`, `often`, `region`, `city`, `name`, `company`, `trade`, `channel`, `message`) | `goQuote(fill)` / `arifa:quote-fill` |
| `ask_contact` | `fields[]`, `consents[]` | show the contact card in the chat (name, phone, email, two separate unticked ticks: WhatsApp, email), then `POST /sessions/{id}/contact` |

Every action has `id` (a hash of the intent: **do an id once**, even if it arrives twice), `layer`
(`instant` or `agent`) and `resolved` (`path_en`, `path_ar`, `anchor`: use the one of the page's locale, not
the chat language). The backend checks every action against the site map before sending it: an unknown
product, family, page or section is never sent. No action carries a CSS selector, a free URL or a price.

**Three speed layers.**

| Layer | Where | Time | What |
|---|---|---|---|
| 0, optimistic | the browser, from the site map | ~0 ms | optional: the same matching rules (test cases: `vectors/site-nav.json`) move the page before the request is sent |
| 1, instant | the backend, before the AI | under 100 ms (live: 15-150 ms) | product codes, family words in English and Arabic, pages and sections, the factory film |
| 2, agent | the AI's own tools | 1-8 s | unclear needs ("a container for 1 kg of biryani"): it finds the product and opens it |

Send `Accept: text/event-stream` so the page moves as soon as an action is known (the JSON answer comes only
when the whole reply is written: live, 3-19 s later). Queue the actions; run the next only when the current
animation ends; cancel the queue if the visitor scrolls or clicks.

**`context` (`SiteContext`)**, sent with every message (and with `events`): `path`, `page` (home, products,
product, about, quality, clients, contact, other), `locale` (en, ar), `family` (the catalogue filter),
`product_id` (the product page open), `quick_view_id` (the quick view open), `section` (in view),
`enquiry_list[]`, `input` (text or voice). Without it the assistant cannot tell "this one" from any other.

**Streaming (SSE).** Events, in order: `action` (one site action), `delta` `{text}` (the reply, a sentence at
a time, already checked by the price guard), `done` `{language, handed_over}`; `error` `{status, code,
message}` replaces `done` when the turn fails (same codes as §4).

**Voice (LiveKit data channel, WP-C5).** A call is the same visit and the same conversation as the chat.
Topics (JSON, reliable): `kx.site.actions` (agent -> page: one action, same shape as above), `kx.captions`
(agent -> page: `{role: visitor|assistant, text, final}`, for the captions §9 asks for), `kx.chat.in`
(page -> agent: `{text, context?}`: text typed while the call is on, answered in the call, so chat and voice
never race), `kx.site.context` (page -> agent: a `SiteContext` when the visitor moves). The recording notice
plays once per visit: a page load that rejoins the room does not repeat it, and the agent does not greet again.
Keep the room connection in the root layout and move with client-side navigation (`router.push`), so a
call survives a page change.

**Nudges.** The assistant speaks first only after the visitor has written or spoken, at most 3 times a
visit, 30 s apart: 20 s on a product (`product_dwell`), an enquiry-list add (`enquiry_add`; with the contact
card when no phone or email is known), 45 s idle on Contact (`idle`). Send the `events`; show a `reply` as an
assistant message and do its `actions`.

**Reference implementation.** `website-adapter/arifa-site-actions.patch` is the change the live test of
20 Nov ran on the current site (commit `0e160eb`): `siteContext()` in `src/lib/arifaApi.ts`, `context` on every
message, and the actions mapped onto `act()` (`show_family` -> family, `show_product` -> product by its ref,
`fill_enquiry` -> quote, `factory_tour` -> factory, `navigate` -> the page). Apply it with `git apply`, or use
it as a guide.

---

## 3. Session and calls

1. `POST /v1/public/sessions` `{turnstile_token, language?, voice_consent, cookie_consent, country_code?}` ->
   `201 {session_id, session_token, expires_at, language, voice_available}`.
   * `turnstile_token`: from the Cloudflare Turnstile widget on the page (D39).
   * Keep `session_token` in memory (or sessionStorage) and send it as `Authorization: Bearer <session_token>`
     on the other calls. It lasts 2 hours; on `401` start a new session.
2. Chat turn: `POST /v1/public/sessions/{id}/messages` `{text, language?, context?}` ->
   `{reply, language, handed_over, actions}`. `reply` can be `null` (the conversation is with a person now):
   show nothing new, or the hand-over line. Show `reply` as plain text (it may contain line breaks).
   * `context` (`SiteContext`): where the visitor is (`path`, `page`, `locale`, `family`, `product_id`,
     `quick_view_id`, `section`, `enquiry_list`, `input`). Send it with every message; omitted, the last one
     sent is used.
   * `actions` (at most 3, in order): what the assistant asks the page to do: `show_family`, `show_product`,
     `navigate`, `scroll_to`, `factory_tour`, `add_to_enquiry`, `fill_enquiry`, `ask_contact`. Each has an
     `id` (the same intent always has the same id: do it once, even if it arrives twice), `layer` (`instant`
     or `agent`) and `resolved` (`path_en`, `path_ar`, `anchor`; use the one of the **page** locale). Map them
     to the site's own functions (`showFamily`, `showProduct`, `goQuote` / `arifa:quote-fill`, `goFactory`,
     `lenis.scrollTo`). Every action was checked against the site map; none carries a selector or a price.
   * `Accept: text/event-stream` streams the turn: `event: action` (the page can move at once, before the
     reply), `event: delta` `{text}` (the reply, a sentence at a time), `event: done`
     `{language, handed_over}`, or `event: error` `{status, code, message}` instead of `done`.
   * The same conversation continues in voice: chat and voice of one visit share one thread.
3. Voice: `POST /v1/public/sessions/{id}/voice` -> `{livekit_url, token, room, language, expires_at}`.
   Join with the LiveKit browser SDK (`livekit-client`): `room.connect(livekit_url, token)`, publish the
   microphone, play the agent's audio track. The token admits this one room only; ask for a new one if it
   expires (30 minutes). Refused with `422`:
   * `reason: "text_only"`: the language has no live voice (Sinhala) or voice is not configured: use chat;
   * `reason: "no_voice_consent"`: the session started without *Enter the factory*: start a new session with
     `voice_consent: true` after the visitor presses it.
4. Identify: `POST /v1/public/sessions/{id}/identify` `{phone?, email?, name?}` -> `{ok: true}` always (it does
   not reveal whether the buyer was known). `422 reason: "invalid"` = the phone or email does not look right.
5. Contact card (the `ask_contact` action): `POST /v1/public/sessions/{id}/contact`
   `{name?, company?, phone?, email?, whatsapp_opt_in, email_opt_in, consent_wording?}` -> `{ok: true}`.
   The two ticks are separate and never pre-ticked; send the words shown next to them as `consent_wording`.
6. Moves: `POST /v1/public/sessions/{id}/events` `{type, context, seconds?}` with `type` one of `page_view`,
   `product_open`, `product_dwell` (with `seconds` on the product), `enquiry_add`, `idle` (with `seconds`).
   -> `{reply, actions}`: usually empty; sometimes a short message from the assistant (show it as an
   assistant message). The assistant speaks first only after the visitor has written or spoken, at most 3
   times a visit: after 20 s on a product, on an enquiry-list add, after 45 s idle on Contact.
7. Enquiry desk (CT-01, instead of `mailto:`): `POST /v1/public/enquiries` with the desk's own fields
   (`family[]`, `products[]` = the enquiry list, `detail`, `size`, `quantity`, `often`, `region`, `city`,
   `name`, `company`, `trade`, `channel`, `email`, `phone`, `extra`, `message`, `locale`, the two opt-ins and
   `consent_wording`), plus `session_id` with the session token when a chat is open, else `turnstile_token`.
   -> `201 {ok, reference}` (show "We have your enquiry (W-3F9A2C)"). A phone or an email is required
   (`422 reason: "empty"`).

When the visitor says "stop" in voice, the agent stops talking and listens (§8.1: on voice "stop" means
"wait"); nothing for the site to do.

---

## 4. Limits and failures (D34, D39)

| Status | When | What to show |
|---|---|---|
| `429` | Too many requests from this IP (30 a minute) or session (12 a minute); the site as a whole is over its AI turns a minute (`KX_APP_PUBLIC_TURNS_PER_MINUTE`, 60); or this IP started too many sessions today (`KX_APP_PUBLIC_SESSIONS_PER_IP_PER_DAY`, 20) | "Please slow down" and retry after a few seconds |
| `503` | The daily AI budget is used up, or the assistant is unavailable | Offer **WhatsApp click-to-chat** (the documented last resort) |
| `200`, `handed_over: true` | The website's own share of the daily AI budget is used up (security review M6: `KX_APP_SPEND_PUBLIC_AI_SHARE`, 30 %); the reply is the safe line and the sales team takes over, while WhatsApp and email keep the AI. Voice answers `503` then | Show the reply and offer WhatsApp click-to-chat |
| `401` | Session token missing or expired | Start a new session |
| `403` | Turnstile failed, or the token belongs to another session | Reload the widget |
| `422` | See the `reason` values above; field errors come as `{"detail": [...]}` | |

Business errors use `application/problem+json` (`type`, `title`, `status`, `detail`, `reason`), the same as
the CRM API.

---

## 5. What the live test found on the current site (20 Nov, commit `0e160eb`)

The site ran (`next dev`) against the live backend with the real AI. What already works with the backend
unchanged: sessions, chat turns, voice tokens, identify, error handling (429 / 503 / WhatsApp fallback). What
to add, in order of value:

| # | Finding | What to do |
|---|---|---|
| 1 | The assistant panel has **no text box**: a visitor without a microphone (or who prefers typing) cannot ask anything; design doc AS-02 and §9 (accessibility) ask for it | add a text field to the panel; send what is typed through the same `handle()`; in a call, send it on `kx.chat.in` |
| 2 | `actions` are ignored (`backendTurn` returns `action: null`) | map them onto `act()`: `website-adapter/arifa-site-actions.patch` |
| 3 | No `context` is sent | `siteContext()` in the patch; also send it with `events` when the visitor moves |
| 4 | Turns use the JSON answer, so the page moves only after the whole reply (live: 3-19 s) | `Accept: text/event-stream` (§2a): the page moves in under 0.2 s |
| 5 | The enquiry desk opens `mailto:` | `POST /v1/public/enquiries` (§3 item 7) |
| 6 | No contact card, no consent ticks | the `ask_contact` action and `POST /sessions/{id}/contact` |
| 7 | No `events` | `product_dwell`, `enquiry_add`, `idle`, `page_view` (§3 item 6) |
| 8 | Content is read from `catalogue.json`, `site.ts`, `clients.json` | `GET /v1/content/*` with revalidation (`CMS_API.md`) |
| 9 | `showProduct()` keeps the previous search (`?q=30 cm`): behind the opened product the grid reads "No match" | clear `q` (and the family filter) when the assistant opens a product |

---

## Website endpoint reference

### website

#### `POST /v1/public/sessions`

§6 step 1: start a website conversation (Turnstile-checked).

**Who:** public

**Request body** (`application/json`): `SessionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `turnstile_token` | string | no | max length 4096; default `""` |
| `language` | string or null | no |  |
| `voice_consent` | boolean | no | default `false` |
| `cookie_consent` | boolean | no | default `false` |
| `country_code` | string or null | no |  |
| `context` | `SiteContext` or null | no |  |

<details><summary>Example request</summary>

```json
{
  "turnstile_token": "",
  "language": "en",
  "voice_consent": false,
  "cookie_consent": false,
  "country_code": "AE",
  "context": {
    "path": "/",
    "page": "home",
    "locale": "en",
    "family": "<family>",
    "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "quick_view_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "section": "<section>",
    "enquiry_list": [
      "<enquiry_list>"
    ],
    "input": "text"
  }
}
```

</details>

**Response 201:** `SessionOut`

<details><summary>Example response 201</summary>

```json
{
  "session_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "session_token": "eyJhbGciOiJIUzI1NiJ9.eyJzaWQiOiIuLi4ifQ.signature",
  "expires_at": "2026-12-15T09:00:00+04:00",
  "language": "en",
  "voice_available": false
}
```

</details>


---

#### `POST /v1/public/sessions/{session_id}/messages`

One chat turn (§6 steps 2-6) through the same agents, guard and router as WhatsApp; the page moves with it (D55). `Accept: text/event-stream` streams `action`, `delta`, `done` / `error`.

**Who:** the website session: header `Authorization: Bearer <session_token>`

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `session_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `MessageIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | min length 1; max length 2000 |
| `language` | string or null | no |  |
| `context` | `SiteContext` or null | no |  |

<details><summary>Example request</summary>

```json
{
  "text": "Do you have 8325 containers with lids? I need 20,000 a month in Dubai.",
  "language": "en",
  "context": {
    "path": "/",
    "page": "home",
    "locale": "en",
    "family": "<family>",
    "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "quick_view_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "section": "<section>",
    "enquiry_list": [
      "<enquiry_list>"
    ],
    "input": "text"
  }
}
```

</details>

**Response 200:** `MessageOut`

<details><summary>Example response 200</summary>

```json
{
  "reply": "Yes: 8325 is our 1-litre aluminium container with lid, packed 1 x 1000 pcs.",
  "language": "en",
  "handed_over": false,
  "actions": [
    "<actions>"
  ]
}
```

</details>


---

#### `POST /v1/public/sessions/{session_id}/voice`

A LiveKit room token for live voice (participant metadata: deal_ref, language, session_id).

**Who:** the website session: header `Authorization: Bearer <session_token>`

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `session_id` | path | string (uuid) | yes |  |

**Response 200:** `VoiceOut`

<details><summary>Example response 200</summary>

```json
{
  "livekit_url": "<livekit_url>",
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIuLi4ifQ.signature",
  "room": "<room>",
  "language": "en",
  "expires_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/public/sessions/{session_id}/identify`

§6 step 7: the visitor typed their phone or email; a returning buyer is recognised now, never before. The answer does not say whether the buyer was known.

**Who:** the website session: header `Authorization: Bearer <session_token>`

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `session_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `IdentifyIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `phone` | string or null | no |  |
| `email` | string or null | no |  |
| `name` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "phone": "+971500000001",
  "email": "qa.buyer@example.com",
  "name": "Aisha Khan"
}
```

</details>

**Response 200:** `IdentifyOut`

<details><summary>Example response 200</summary>

```json
{
  "ok": true
}
```

</details>


---

#### `POST /v1/public/sessions/{session_id}/contact`

The chat's contact card (D59): details plus the WhatsApp / email opt-ins with their wording. The same rules as identify (a typed phone or email is a claim, D-4) and the same answer.

**Who:** the website session: header `Authorization: Bearer <session_token>`

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `session_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ContactIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string or null | no |  |
| `company` | string or null | no |  |
| `phone` | string or null | no |  |
| `email` | string or null | no |  |
| `whatsapp_opt_in` | boolean | no | default `false` |
| `email_opt_in` | boolean | no | default `false` |
| `consent_wording` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "name": "Aisha Khan",
  "company": "Gulf Kitchens LLC",
  "phone": "+971500000001",
  "email": "qa.buyer@example.com",
  "whatsapp_opt_in": false,
  "email_opt_in": false,
  "consent_wording": "<consent_wording>"
}
```

</details>

**Response 200:** `IdentifyOut`

<details><summary>Example response 200</summary>

```json
{
  "ok": true
}
```

</details>


---

#### `POST /v1/public/sessions/{session_id}/events`

The visitor moved on the site. Their place is saved; the assistant may nudge (rarely, and only after the visitor has spoken: `website/service.py`).

**Who:** the website session: header `Authorization: Bearer <session_token>`

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `session_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `EventIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `page_view` \| `product_open` \| `product_dwell` \| `enquiry_add` \| `idle` | yes |  |
| `context` | `SiteContext` | yes |  |
| `seconds` | number or null | no |  |

<details><summary>Example request</summary>

```json
{
  "type": "page_view",
  "context": {
    "path": "/",
    "page": "home",
    "locale": "en",
    "family": "<family>",
    "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "quick_view_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "section": "<section>",
    "enquiry_list": [
      "<enquiry_list>"
    ],
    "input": "text"
  },
  "seconds": 1
}
```

</details>

**Response 200:** `EventOut`

<details><summary>Example response 200</summary>

```json
{
  "reply": "Yes: 8325 is our 1-litre aluminium container with lid, packed 1 x 1000 pcs.",
  "actions": [
    "<actions>"
  ]
}
```

</details>


---

#### `POST /v1/public/enquiries`

CT-01 enquiry desk (replaces `mailto:`). With a session token the enquiry joins that visit's deal; without one a Turnstile token is required. The CRM gets English labels (design doc §6).

**Who:** the website session: header `Authorization: Bearer <session_token>`

**Request body** (`application/json`): `EnquiryIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `family` | list of string | no | max items 8 |
| `products` | list of string | no | max items 50 |
| `detail` | string or null | no |  |
| `size` | string or null | no |  |
| `quantity` | string or null | no |  |
| `often` | string or null | no |  |
| `region` | string or null | no |  |
| `city` | string or null | no |  |
| `name` | string or null | no |  |
| `company` | string or null | no |  |
| `trade` | string or null | no |  |
| `channel` | `email` \| `call` \| `whatsapp` or null | no |  |
| `email` | string or null | no |  |
| `phone` | string or null | no |  |
| `extra` | string or null | no |  |
| `message` | string or null | no |  |
| `locale` | `en` \| `ar` | no | default `"en"` |
| `whatsapp_opt_in` | boolean | no | default `false` |
| `email_opt_in` | boolean | no | default `false` |
| `consent_wording` | string or null | no |  |
| `session_id` | string (uuid) or null | no |  |
| `turnstile_token` | string | no | max length 4096; default `""` |

<details><summary>Example request</summary>

```json
{
  "family": [
    "<family>"
  ],
  "products": [
    "<products>"
  ],
  "detail": "<detail>",
  "size": "<size>",
  "quantity": "<quantity>",
  "often": "<often>",
  "region": "<region>",
  "city": "Dubai",
  "name": "Aisha Khan",
  "company": "Gulf Kitchens LLC",
  "trade": "<trade>",
  "channel": "email",
  "email": "qa.buyer@example.com",
  "phone": "+971500000001",
  "extra": "<extra>",
  "message": "<message>",
  "locale": "en",
  "whatsapp_opt_in": false,
  "email_opt_in": false,
  "consent_wording": "<consent_wording>",
  "session_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "turnstile_token": ""
}
```

</details>

**Response 201:** `EnquiryOut`

<details><summary>Example response 201</summary>

```json
{
  "ok": true,
  "reference": "<reference>"
}
```

</details>


---

## Website endpoint reference: data shapes

### `AddToEnquiry`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `add_to_enquiry` | no | default `"add_to_enquiry"` |
| `product_ids` | list of string | yes | min items 1; max items 10 |

### `AskContact`

Show the inline contact card in the chat: name / phone / email with the WhatsApp and email consents.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `ask_contact` | no | default `"ask_contact"` |
| `fields` | list of `name` \| `company` \| `phone` \| `email` | no | max items 4 |
| `consents` | list of `whatsapp` \| `email` | no | max items 2 |

### `ContactIn`

The chat's contact card. The opt-ins are separate ticks (never pre-ticked on the site).

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string or null | no |  |
| `company` | string or null | no |  |
| `phone` | string or null | no |  |
| `email` | string or null | no |  |
| `whatsapp_opt_in` | boolean | no | default `false` |
| `email_opt_in` | boolean | no | default `false` |
| `consent_wording` | string or null | no |  |

### `EnquiryFill`

The enquiry desk's own field names (CT-01, `enquiryDeskClient.ts`). Never a price.

| Field | Type | Required | Notes |
|---|---|---|---|
| `family` | list of string | no | max items 8 |
| `detail` | string or null | no |  |
| `size` | string or null | no |  |
| `quantity` | string or null | no |  |
| `often` | string or null | no |  |
| `region` | string or null | no |  |
| `city` | string or null | no |  |
| `name` | string or null | no |  |
| `company` | string or null | no |  |
| `trade` | string or null | no |  |
| `channel` | `email` \| `call` \| `whatsapp` or null | no |  |
| `message` | string or null | no |  |

### `EnquiryIn`

The enquiry desk's fields (their own names), the enquiry list and the consents.

| Field | Type | Required | Notes |
|---|---|---|---|
| `family` | list of string | no | max items 8 |
| `products` | list of string | no | max items 50 |
| `detail` | string or null | no |  |
| `size` | string or null | no |  |
| `quantity` | string or null | no |  |
| `often` | string or null | no |  |
| `region` | string or null | no |  |
| `city` | string or null | no |  |
| `name` | string or null | no |  |
| `company` | string or null | no |  |
| `trade` | string or null | no |  |
| `channel` | `email` \| `call` \| `whatsapp` or null | no |  |
| `email` | string or null | no |  |
| `phone` | string or null | no |  |
| `extra` | string or null | no |  |
| `message` | string or null | no |  |
| `locale` | `en` \| `ar` | no | default `"en"` |
| `whatsapp_opt_in` | boolean | no | default `false` |
| `email_opt_in` | boolean | no | default `false` |
| `consent_wording` | string or null | no |  |
| `session_id` | string (uuid) or null | no |  |
| `turnstile_token` | string | no | max length 4096; default `""` |

### `EnquiryOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `ok` | boolean | no | default `true` |
| `reference` | string | yes |  |

### `EventIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `type` | `page_view` \| `product_open` \| `product_dwell` \| `enquiry_add` \| `idle` | yes |  |
| `context` | `SiteContext` | yes |  |
| `seconds` | number or null | no |  |

### `EventOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `reply` | string or null | no |  |
| `actions` | list of any | no | max items 3 |

### `FactoryTour`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `factory_tour` | no | default `"factory_tour"` |
| `chapter` | string or null | no |  |
| `seconds` | number or null | no |  |

### `FillEnquiry`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `fill_enquiry` | no | default `"fill_enquiry"` |
| `fill` | `EnquiryFill` | yes |  |

### `IdentifyIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `phone` | string or null | no |  |
| `email` | string or null | no |  |
| `name` | string or null | no |  |

### `IdentifyOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `ok` | boolean | no | default `true` |

### `MessageIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | min length 1; max length 2000 |
| `language` | string or null | no |  |
| `context` | `SiteContext` or null | no |  |

### `MessageOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `reply` | string or null | yes |  |
| `language` | string | yes |  |
| `handed_over` | boolean | yes |  |
| `actions` | list of any | no | max items 3 |

### `Navigate`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `navigate` | no | default `"navigate"` |
| `page` | string | yes | pattern `^[a-z0-9][a-z0-9_-]{0,127}$` |
| `section` | string or null | no |  |

### `Resolved`

Where the action lands, in both site languages (filled by the server, never by the model).

| Field | Type | Required | Notes |
|---|---|---|---|
| `path_en` | string | yes |  |
| `path_ar` | string | yes |  |
| `anchor` | string or null | no |  |

### `ScrollTo`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `scroll_to` | no | default `"scroll_to"` |
| `section` | string | yes | pattern `^[a-z][a-z0-9-]{0,63}$` |

### `SessionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `turnstile_token` | string | no | max length 4096; default `""` |
| `language` | string or null | no |  |
| `voice_consent` | boolean | no | default `false` |
| `cookie_consent` | boolean | no | default `false` |
| `country_code` | string or null | no |  |
| `context` | `SiteContext` or null | no |  |

### `SessionOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `session_id` | string (uuid) | yes |  |
| `session_token` | string | yes |  |
| `expires_at` | string (date-time) | yes |  |
| `language` | string | yes |  |
| `voice_available` | boolean | yes |  |

### `ShowFamily`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `show_family` | no | default `"show_family"` |
| `family` | string | yes | pattern `^[a-z0-9][a-z0-9_-]{0,127}$` |

### `ShowProduct`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | no | default `""` |
| `layer` | `instant` \| `agent` | no | default `"agent"` |
| `resolved` | `Resolved` or null | no |  |
| `type` | `show_product` | no | default `"show_product"` |
| `product_id` | string | yes | pattern `^[a-z0-9][a-z0-9_-]{0,127}$` |
| `view` | `quick` \| `page` | no | default `"quick"` |

### `SiteContext`

Where the visitor is right now (sent with every message and every page or product change).

| Field | Type | Required | Notes |
|---|---|---|---|
| `path` | string | no | max length 300; default `"/"` |
| `page` | `home` \| `products` \| `product` \| `about` \| `quality` \| `clients` \| `contact` \| `other` | no | default `"home"` |
| `locale` | `en` \| `ar` | no | default `"en"` |
| `family` | string or null | no |  |
| `product_id` | string or null | no |  |
| `quick_view_id` | string or null | no |  |
| `section` | string or null | no |  |
| `enquiry_list` | list of string | no | max items 50 |
| `input` | `text` \| `voice` | no | default `"text"` |

### `VoiceOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `livekit_url` | string | yes |  |
| `token` | string | yes |  |
| `room` | string | yes |  |
| `language` | string | yes |  |
| `expires_at` | string (date-time) | yes |  |

