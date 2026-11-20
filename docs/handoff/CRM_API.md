# CRM API: frontend hand-off

For the developer building the **CRM screens** (staff web app, desktop and mobile) against a mock first, then
the real API. Everything below is taken from the code (the slice routers under `packages/kx-core-crm/src/kx/crm/`,
`kx/automation/admin/router.py`) and the business flow (SRS §3, §7A, §14, §15, §20, §21). The endpoint reference
in the second half is **generated from the code** (FastAPI OpenAPI), so names, types and limits are exact.

Companion files in this folder:

* `openapi-crm.json`: the OpenAPI 3.1 document of every CRM endpoint (import into Postman, or mock it, below).
* `WEBSITE_API.md`: the public website API. `CMS.md`: the content side.

---

## 1. Working against a mock

```bash
# any OpenAPI mock server works; for example Prism:
npx @stoplight/prism-cli mock docs/handoff/openapi/openapi-crm.json --port 4010
# then point the app at http://localhost:4010 (the paths below start with /v1)
```

The mock returns example data shaped exactly like the real responses. Two things a mock cannot reproduce:
the login cookie (section 3) and the business refusals (section 6); build those screens from this document.

Real API locally: `make up && kx migrate && kx api` (see `README.md`), base URL `http://localhost:8000`.
Create the first user with `kx create-user --role admin --email you@example.com --name "You"`.

---

## 2. What the CRM is (core design)

The CRM is where Arifa's team works the deals the AI starts. The AI talks to buyers on WhatsApp, email and the
website; **the backend builds every quote** (§11.1) and **a person approves it** before anything priced goes
out. The screens never compute prices: they show what the API returns and send decisions back.

| Role (`role` in the token) | What they do (SRS §3) |
|---|---|
| `sales` | Owns assigned deals. Approves 1st, revised and final quotes on their deals. Handles change requests, payment, PO, order updates. Records WON / LOST. Sees **only their own deals** (and those of an away colleague they cover). |
| `manager` | Price list and catalogue, assigns / reassigns, below-minimum decisions, sees everything. |
| `md` | Sees everything, dashboards, can take over any deal. **The MD passes every check that allows `manager`.** |
| `admin` | Users, roles, settings, channels (WhatsApp numbers, templates), kill switch. |

Screens (SRS §20) and the endpoints behind them:

| Screen | Endpoints |
|---|---|
| 1 Login (two-step) | `POST /v1/auth/login`, `/v1/auth/mfa/totp`, `/v1/auth/mfa/email/send`, `/v1/auth/mfa/email/verify`, `/v1/auth/refresh`, `/v1/auth/logout`, `GET /v1/auth/me`, TOTP enrolment `/v1/auth/totp/*`, password `/v1/auth/password*` |
| 2 My inbox (SLA timers) | `GET /v1/inbox` (everyone's own items); managers also `GET /v1/approvals` |
| 3 Deals board | `GET /v1/deals` (filters: stage, owner, country, product, sku, value range, opted_out; cursor pages) |
| 4 Deal page | `GET /v1/deals/{id}` (with `ai_summary` at the top, §7A.2), `/timeline`, `/quotes`, `POST /stage`, `/reopen`, `/ai`, `/reassign`, `/takeover`, `/handback`, `/messages` (reply to the buyer), `/call` (click-to-call), `/payments`, `/won`, `/personal-contact-shared`, `PATCH /v1/deals/orders/{id}` |
| 5 Quote approval (§11.3) | `GET /v1/quote-versions/{id}`, `POST /v1/approvals/{id}/decision`, `POST /v1/deals/{id}/quotes`, `/quotes/revise`, `/quotes/manual` |
| Change requests (§13) | `GET /v1/change-requests`, `/{id}`, `POST /{id}/start`, `/revise`, `/resolve`, `/decline` |
| 6 Contacts and companies | `GET/PATCH /v1/contacts…`, `GET/POST/PATCH /v1/companies…` |
| 7 Catalogue and price list | **Product workbook** (main way, §5.1): `GET /v1/catalogue/workbook`, `POST /v1/catalogue/workbook/preview`, `POST /v1/catalogue/workbook/apply`. Single edits: `GET /v1/products`, `PATCH /v1/products/{id}`, price tiers `/v1/products/{id}/price-tiers`, `/v1/price-tiers/{id}`, history `/v1/products/{id}/history`, `/v1/price-list/history`. Older price-only Excel: `POST /v1/price-list/import`, `GET /v1/price-list/export` |
| 8 Stock | `GET/PUT /v1/stock` |
| 9 Orders | `GET /v1/orders`, `PATCH /v1/deals/orders/{id}` |
| 10 Dashboards (§21) | `GET /v1/dashboards/salesperson`, `/manager`, `/md`, `GET /v1/dashboard/summary` |
| 11 Settings | `GET/PUT /v1/settings…`, `PUT /v1/feature-flags/{key}`, FX `GET/POST /v1/fx-rates`, users `/v1/users…`, availability `PUT /v1/users/{id}/availability`, WhatsApp numbers `/v1/admin/channel-accounts`, templates `/v1/admin/message-templates`, kill switch `/v1/admin/kill-switch`, material prices `/v1/price-proposals…`, `/v1/materials/freshness` |
| 11b Message texts (§5.2) | `GET /v1/texts`, `PUT /v1/texts/{key}`, `POST /v1/texts/{key}/reset`, `GET /v1/texts/{key}/history`, `POST /v1/texts/translate-missing`; WhatsApp / email templates with versions `GET/PUT /v1/admin/message-templates`, `POST /v1/admin/message-templates/{id}/status` |
| 11c Company details (§5.3) | `GET /v1/company`, `PATCH /v1/company`, `PUT /v1/company/logo`, `DELETE /v1/company/logo` |
| 12 Exports | `GET /v1/exports/{deals|contacts|companies|orders|products}?format=csv|xlsx` |

Deal stages (`stage`): `NEW`, `QUALIFIED`, `QUOTATION`, `NEGOTIATION`, `READY_TO_CLOSE`, `PAYMENT`, `WON`, `LOST`.
LOST reasons (`reason` when moving to LOST): `price_too_high`, `delivery_not_suitable`, `bought_competitor`,
`product_unavailable`, `no_response_postponed`, `budget`, `duplicate`, `other`, `opted_out`.

Rules the screens must respect:

* **Approvals, price-list edits, settings, payments, WON, reopen** need a session signed in with the
  authenticator app (`mfa=true` in the login answer). An email-code session gets `403` there: show "sign in
  with your authenticator app to approve".
* **No cost or margin on the v1 screens** (§3: "See cost and margin data: not in v1"). The endpoint
  `GET /v1/quote-versions/{id}/costs` exists for the MD only; leave it out of v1 screens unless asked.
* **Opted out** (`opted_out_at` set on the deal): show the badge; the API refuses messages to that buyer.
* **Optimistic concurrency**: stage moves send the `expected_version` they displayed; `409` = someone changed
  the deal, reload it.
* **After hand-over (§14)** the salesperson replies from the deal page on the same company number:
  `POST /v1/deals/{id}/messages` with a `client_key` (a UUID you generate per message, so a double tap sends
  once). A `422` with `reason: "window_closed"` means WhatsApp's 24-hour window has closed: offer the button
  "Send the re-open message" which resends with `reopen_template: true`. A `422` with
  `reason: "unapproved_price"` means the text names a price that is not in an approved quote (`amounts` lists
  them): tell the salesperson to revise the quote instead.
* **Click-to-call** rings the salesperson's own phone first, then the buyer, from the company number. Needs
  the salesperson's phone in their profile (`422 no_staff_phone`); refused if the buyer said "don't call me"
  (`422 opt_out`).

---

## 3. Sign-in, tokens, sessions (D26)

1. `POST /v1/auth/login {email, password}` -> `{challenge_token, methods, totp_enrolled, expires_at}`.
   `methods` is `["totp","email"]` once the authenticator is set up, `["email"]` before.
2. Second step, either:
   * `POST /v1/auth/mfa/totp {challenge_token, code}` -> tokens with `mfa: true`; or
   * `POST /v1/auth/mfa/email/send {challenge_token}` (204; a 6-digit code goes to the work email, valid
     10 minutes), then `POST /v1/auth/mfa/email/verify {challenge_token, code}` -> tokens with `mfa: false`.
3. Answer (`TokenOut`): `access_token` (RS256 JWT, 15 minutes), `expires_in`, `mfa`, `amr`,
   `must_change_password`, `totp_enrolled`, `user`. Send `Authorization: Bearer <access_token>` on every call.
4. The refresh token is set as an **HttpOnly cookie `kx_refresh`** (path `/v1/auth`, SameSite=Strict, Secure
   in production). Call `POST /v1/auth/refresh` (with `credentials: "include"`) before the access token expires;
   each refresh **rotates** the cookie. A reused old refresh token ends every session of that user: on `401`
   from refresh, send the user to the login screen. Non-browser clients may send `{"refresh_token": ...}`.
   Security review M2 (19 Nov): every `/v1/auth/*` call from a browser must come from a CRM origin
   (`KX_APP_CORS_ORIGINS`, or `KX_AUTH__CRM_ORIGINS` when set); any other `Origin` gets `403`. CORS with
   credentials is given only to these CRM origins. The public website's origin belongs in
   `KX_APP_CORS_PUBLIC_ORIGINS`: it may call `/v1/public/*` without credentials and nothing else, so never
   list the website in `KX_APP_CORS_ORIGINS`.
5. `must_change_password: true` (a new user's one-time password): force `POST /v1/auth/password` first.
   Until then every route outside `/v1/auth/*` answers `403` "change your one-time password first" (security
   review L7, 19 Nov). Changing the password ends every other session; the one in use stays signed in.
   Security review L1: an access token works only while its sign-in lives. After sign-out, a password reset,
   an MFA reset, a deactivation or a role change, calls answer `401` "your session has ended; sign in again"
   within about 10 seconds: send the user to the login screen. A session ends 12 hours after sign-in
   however often it is refreshed.
   `totp_enrolled: false`: offer `POST /v1/auth/totp/enrol` (returns `secret` + `otpauth_uri` to show as a QR
   code), then `POST /v1/auth/totp/confirm {code}`; the next sign-in can use the authenticator.
6. 5 wrong passwords or codes from one IP lock that IP out of the account for 15 minutes (`429`); 50 from all
   IPs together lock the account (security review M3, 19 Nov). Sign-in, the email code and password recovery are
   rate limited per IP and per typed address (`429`, the same for unknown addresses; show "too many attempts,
   try again in a few minutes"). Forgotten password: `POST /v1/auth/password/reset/start {email}` (`202`;
   at most 3 an hour per address), then `/reset/finish {email, code, new_password}`. Only the newest code works;
   5 wrong codes lock recovery for 15 minutes. Limits: `KX_AUTH__MAX_FAILED_ATTEMPTS`,
   `KX_AUTH__ACCOUNT_LOCK_FAILURES`, `KX_AUTH__RESET_MAX_WRONG_CODES`, `KX_AUTH__RATE_<ROUTE>__BURST` /
   `__PER_MINUTE` (`kx.core.settings.AuthSettings`).

Public key for verifying tokens elsewhere: `GET /.well-known/jwks.json`.

---

### Working in Postman (no re-login every 15 minutes)

Import `docs/handoff/postman/Kairox-CRM-quickstart.postman_collection.json`, set `base_url`, `email` and `password` in the
collection variables, then sign in **once**: "1 Sign in", then "2a Send email code" + "2b Verify email code"
(code into `mfa_code`), or "2c Authenticator code" (needed for approvals). From then on a collection
pre-request script renews the 15-minute access token automatically before any request that needs it (it sends
the refresh token in the body, which non-browser clients may do, and keeps the rotated one). Sign in again only
when the session ends: 12 hours after sign-in, or after "Sign out" / a password change.

## 4. Conventions

* Base path `/v1`; JSON in and out; UTF-8. IDs are UUIDs. Times are ISO 8601 in UTC (`...Z` / `+00:00`);
  show them in the user's time zone (Arifa: Asia/Dubai). Dates are `YYYY-MM-DD`.
* **Money is a decimal string** (`"12500.00"`), never a float; keep it as a string or use a decimal library.
  Currency codes are ISO 4217 (`AED`, `USD`, `SAR` ...).
* Lists that can grow are **cursor pages**: `{items: [...], next_cursor: "..." | null}`; pass `cursor` and
  `limit` (1-100) to get the next page. Smaller lists are plain arrays.
* There is no push channel to the CRM in v1: refresh the inbox and the open deal by polling (for example every
  30 seconds while visible). Staff also get WhatsApp / email alerts (§16).
* **Unverified emails** (security review M8, 19 Nov): an inbound email whose sender failed SPF / DKIM / DMARC
  is shown on the deal its address claims as timeline kind `message_in_unverified` (summary starts
  "Sender not verified:", no contact attached) and in `GET /v1/inbox` as kind `unverified_email` for 7 days.
  Show it with a clear "sender not verified" warning. The AI did not answer it and nothing changed
  automatically (no opt-out, no contact update); the manager and the deal's salesperson got an alert.

---

## 5. Exports and files

* `GET /v1/exports/{list}?format=csv|xlsx` returns the file (`Content-Disposition: attachment`).
* `GET /v1/price-list/export` returns the price list as `.xlsx`. `POST /v1/price-list/import` takes the
  `.xlsx` file itself as the request body (columns `sku, min_qty, max_qty, list_price, min_price, currency`).
  All rows are checked first: any error saves nothing and the answer lists the row errors (§10).
* Quote PDFs are produced and sent by the backend; the deal page shows them through the quote versions.

### 5.1 Product workbook: one Excel file for products, prices and website details (18 Nov)

Client decision: staff keep the whole catalogue in **one workbook**. One upload updates the CRM (prices, tiers,
MOQ, delivery days) **and** the CMS (product details as **drafts**; a manager previews and publishes them in the
CMS, then the website changes). Prices never go to the CMS. Who: **manager, MD, admin**, signed in with the
authenticator app (`403` otherwise).

Screen "Product workbook" (under Catalogue), three buttons and one result panel:

1. **Download current catalogue**: `GET /v1/catalogue/workbook` returns `product-workbook.xlsx` with the sheets
   *How to fill*, *Products*, *Price tiers*, *Categories*, already filled with today's data. Staff change
   cells; they never start from an empty sheet.
2. **Upload**: `POST /v1/catalogue/workbook/preview` with the `.xlsx` file itself as the request body
   (`Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, max 10 MB). **Saves
   nothing.** Show the answer:
   * `summary`: new / updated / unchanged products, price lists changed, categories changed, website drafts.
   * `errors[]` (`sheet`, `row`, `column`, `message`): a table "Sheet / Row / Column / Problem". If `ok` is
     false, the Apply button stays disabled: staff fix the file and upload again.
   * `warnings[]`: show, but Apply is allowed (e.g. "BOX-1 has no price tiers: it cannot be quoted yet").
   * `products[]`: per product `code`, `is_new`, `changes[]` (`field`, `before`, `after`) and `website_draft`
     (this product's details will be saved in the CMS as a draft). Show old -> new side by side.
   * `price_lists[]`: per product the tiers `before` and `after` as rows `[from qty, to qty, list price,
     minimum price]` (strings, exact; `null` = no upper limit / no minimum).
   * `categories[]`.
3. **Apply**: `POST /v1/catalogue/workbook/apply?token=<token from the preview>` with **the same file** as the
   body. Saves everything or nothing and answers the counts. `409` = the catalogue changed since the preview
   (someone else saved, or another file was sent): upload again to get a new preview. `422` = the file has
   errors.

After Apply show: "Saved. N product(s) were sent to the website as drafts: open the CMS, preview and publish
them." Keep the uploaded file in browser memory between preview and apply (do not ask the user to pick it
twice).

Rules the screen can repeat to staff (they are also in the *How to fill* sheet): a blank cell keeps the current
value and `-` clears it; never change a code; a product missing from the file is kept (Active = No stops
selling it); in *Price tiers* list all tiers of a product, a product not in that sheet keeps its prices; no
prices in text columns; photos and videos are added in the CMS.

History: every workbook upload is in `GET /v1/price-list/history` (action `catalogue.workbook_applied`) and each
product's changes in `GET /v1/products/{id}/history` (actions `product.created`, `product.updated`,
`price_tier.created`). The MD reads these on the price-list history screen.


### 5.2 Message texts and templates: editable by the manager and the MD (18 Nov)

Client decisions: the **manager** edits the wording of the AI's fixed phrases, the buyer messages that carry
quotes and summaries, and the staff alerts; the **MD** may edit too and sees every change; staff write
**English only** and the AI translates the buyer and AI texts into Arabic, Hindi, Tamil, Chinese and Sinhala.
Legal and opt-out wording is not editable and not listed.

Screen "Message texts" (Settings), grouped by `group`: `ai` (what the AI says in fixed situations), `buyer`
(quote and summary messages), `staff` (alerts, English only).

* `GET /v1/texts` (manager, MD, admin): per text `key`, `note` (where it is used: show it), `en` (in use),
  `builtin_en`, `placeholders` and `languages[]` with `status`: `built-in`, `edited`, `translated`,
  `outdated` (the AI has not translated the new English yet: the previous text is still sent) or `missing`
  (English is sent in that language).
* **Edit** (manager / MD, authenticator sign-in): `PUT /v1/texts/{key}` `{"text": "..."}`. Live within 30
  seconds. Show the placeholders as chips the user must keep, e.g. `{name}`, `{hours}`; a `422` with
  `reason: "invalid_text"` lists the problem in `detail` (a placeholder missing or unknown, or an amount with a
  currency: prices only ever come from the approved quote). After saving buyer / AI texts show "Translating
  into 5 languages..." and refresh the list a minute later.
* **Undo**: `POST /v1/texts/{key}/reset` brings back the built-in wording; or open the history and save an
  older text again.
* **History** (the MD's view): `GET /v1/texts/{key}/history`: who, when, old and new text, translations.
* "Translate all missing languages" button: `POST /v1/texts/translate-missing` (manager / MD).

**WhatsApp / email templates** (`/v1/admin/message-templates`, manager, MD, admin with the authenticator app):
every edit is a version. Editing the **live** WhatsApp template creates a new version (`provider_status:
submitted`, `provider_name` e.g. `quote_ready_v2`, the name to submit to Meta); the live version (`live: true`)
keeps being sent until Meta approves the new one, then record Meta's decision with `POST
/v1/admin/message-templates/{id}/status` `{"provider_status": "approved"}`: it becomes live and the previous
one `superseded`. A version not yet approved is changed in place. Email templates go live at once. List with
`?current_only=true` for the main table and without it for the version history.


### 5.3 Company details: letterhead, logo and bank details on quotes (18 Nov)

Client decision: **admin, MD and manager** change the company details printed on quotes and Requirement
Summaries (authenticator sign-in to save). New documents use them within 30 seconds; quotes already sent keep
their PDF.

* `GET /v1/company`: `saved` (what staff set; an empty field means "use the default from company.yaml"),
  `printed` (what quotes print now) and `has_logo`. Show `printed` as a live preview next to the form.
* `PATCH /v1/company` with only the changed fields: `name`, `address`, `trn`, `phone`, `email` and `bank`
  {`account_name`, `bank_name`, `iban`, `swift`}. `""` clears a field. `422` with `reason: "invalid_company"`
  and `errors[]` (field + message): TRN must have 15 digits, the IBAN is checked (checksum), SWIFT 8 or 11
  characters, email and phone format. Show each message under its field.
* Logo: `PUT /v1/company/logo` with the PNG or JPEG file itself as the body (`Content-Type: image/png` or
  `image/jpeg`, max 200 KB); `DELETE /v1/company/logo` removes it.
* **Bank details:** changing any bank field sends an alert to the MD and the manager (payment-fraud
  protection). Before saving, show a confirmation: "Buyers will pay to this account. The MD and manager will be
  notified." Every change is in the settings history.


### 5.4 FX rates are automatic (18 Nov)

A daily job (06:05 Dubai) stores the rate of each quote currency (`source` = `auto:open-er-api`). The FX
screen (`GET /v1/fx-rates`) shows `source` and `as_of`; label automatic rates "automatic" and manual ones
"entered by manager". `POST /v1/fx-rates` still sets the manager's rate for a day, and an automatic update never
replaces it. If a rate moves more than 10 % in a day it is not stored and the manager gets an alert; quotes
then use the last rate (its date is printed on the quote).

---

## 6. Errors

Business errors are RFC 9457 `application/problem+json`:

```json
{
  "type": "https://errors.kairox.ai/rule_violation",
  "title": "Business rule violated",
  "status": 422,
  "detail": "a price that is not in an approved quote cannot be sent; revise the quote instead",
  "instance": "/v1/deals/0190.../messages",
  "reason": "unapproved_price",
  "amounts": ["AED 9.50"]
}
```

| Status | `type` ends with | Meaning for the screen |
|---|---|---|
| 401 | `unauthorized` | Not signed in / token expired: refresh, else go to login |
| 403 | `forbidden` | Wrong role, someone else's deal, MFA needed, or the MD has taken the deal over |
| 404 | `not_found` | Gone or not visible to this user |
| 409 | `conflict` | Changed by someone else: reload |
| 422 | `rule_violation` | A business rule refused it: show `detail`; switch on `reason` where listed above |
| 429 | `too_many_requests` | Locked out / rate-limited: wait |
| 503 | `unavailable` | A dependency (email, calls) is down: try again later |

Request-shape errors (a missing or wrong field) come from the framework as `422` with
`{"detail": [{"loc": [...], "msg": "...", "type": "..."}]}`: show them next to the fields.

---

## CRM endpoint reference

### admin

#### `GET /v1/price-proposals`

Material price proposals (from the v2 scraper or staff) waiting for the manager's decision.

**Who:** manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `status` | query | `proposed` \| `approved` \| `rejected` \| `superseded` | no | default `"proposed"` |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_RateOut_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "material_code": "<material_code>",
      "rate_per_unit": "<rate_per_unit>",
      "currency": "AED",
      "source": "<source>",
      "source_url": "<source_url>",
      "change_pct": "<change_pct>",
      "status": "<status>",
      "proposed_at": "2026-12-15T09:00:00+04:00",
      "decided_at": "2026-12-15T09:00:00+04:00",
      "note": "<note>"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `POST /v1/price-proposals/{rate_id}/approve`

Manager (MFA): accept a proposed material rate (may be corrected); it becomes the current rate.

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `rate_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `RateDecisionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `rate_per_unit` | number or string or null | no |  |
| `note` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "rate_per_unit": 1,
  "note": "<note>"
}
```

</details>

**Response 200:** `RateOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "material_code": "<material_code>",
  "rate_per_unit": "<rate_per_unit>",
  "currency": "AED",
  "source": "<source>",
  "source_url": "<source_url>",
  "change_pct": "<change_pct>",
  "status": "<status>",
  "proposed_at": "2026-12-15T09:00:00+04:00",
  "decided_at": "2026-12-15T09:00:00+04:00",
  "note": "<note>"
}
```

</details>


---

#### `POST /v1/price-proposals/{rate_id}/reject`

Manager (MFA): reject a proposed material rate.

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `rate_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `RateDecisionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `rate_per_unit` | number or string or null | no |  |
| `note` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "rate_per_unit": 1,
  "note": "<note>"
}
```

</details>

**Response 200:** `RateOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "material_code": "<material_code>",
  "rate_per_unit": "<rate_per_unit>",
  "currency": "AED",
  "source": "<source>",
  "source_url": "<source_url>",
  "change_pct": "<change_pct>",
  "status": "<status>",
  "proposed_at": "2026-12-15T09:00:00+04:00",
  "decided_at": "2026-12-15T09:00:00+04:00",
  "note": "<note>"
}
```

</details>


---

#### `GET /v1/materials/freshness`

How old each material's approved rate is (stale rates block pricing).

**Who:** manager, md

**Response 200:** list of `FreshnessOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "material_code": "<material_code>",
    "days_since_approval": 1,
    "level": "ok"
  }
]
```

</details>


---

#### `GET /v1/settings`

§20.11 business settings (timers, follow-up days, VAT, Incoterm, validity, hours, opt-out rules ...).

**Who:** admin, manager, md

**Response 200:** list of `SettingOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "key": "<key>",
    "value": "<value>",
    "description": "<description>",
    "updated_at": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `PUT /v1/settings/{key}`

Manager / admin (MFA): change one business setting (validated; logged).

**Who:** admin, manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Request body** (`application/json`): `SettingIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `value` | any | yes |  |

<details><summary>Example request</summary>

```json
{
  "value": "<value>"
}
```

</details>

**Response 200:** `SettingOut`

<details><summary>Example response 200</summary>

```json
{
  "key": "<key>",
  "value": "<value>",
  "description": "<description>",
  "updated_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `PUT /v1/feature-flags/{key}`

Manager / admin (MFA): switch a feature on or off (v2 features stay off in v1, D14).

**Who:** admin, manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Request body** (`application/json`): `FlagIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `enabled` | boolean | yes |  |

<details><summary>Example request</summary>

```json
{
  "enabled": false
}
```

</details>

**Response 204:** (no body)

---

#### `PUT /v1/users/{user_id}/availability`

§9.3: away / holiday with a backup (the manager, an admin, or the user themself).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `user_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `AvailabilityIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `is_away` | boolean | yes |  |
| `backup_user_id` | string (uuid) or null | no |  |

<details><summary>Example request</summary>

```json
{
  "is_away": false,
  "backup_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
}
```

</details>

**Response 200:** `UserOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "full_name": "<full_name>",
  "role": "<role>",
  "is_active": false,
  "is_away": false,
  "backup_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "languages": [
    "en"
  ],
  "countries": [
    "<countries>"
  ],
  "category_codes": [
    "<category_codes>"
  ],
  "alert_channels": [
    "<alert_channels>"
  ]
}
```

</details>


---

#### `GET /v1/dashboard/summary`

Compact pipeline summary: deals by stage, open pipeline value, approvals pending / overdue, open tasks.

**Who:** manager, md

**Response 200:** `DashboardSummary`

<details><summary>Example response 200</summary>

```json
{
  "deals_by_stage": {},
  "open_pipeline_aed": "<open_pipeline_aed>",
  "approvals_pending": 1,
  "approvals_overdue": 1,
  "open_tasks": 1,
  "ai_paused_deals": 1,
  "materials": [
    {
      "material_code": "<material_code>",
      "days_since_approval": 1,
      "level": "ok"
    }
  ]
}
```

</details>


---

#### `GET /v1/admin/kill-switch`

D35 kill switch: the current level and what it stops.

**Who:** admin, manager, md

**Response 200:** `KillSwitchOut`

<details><summary>Example response 200</summary>

```json
{
  "level": "off",
  "marketing_stopped": false,
  "calls_stopped": false,
  "voice_stopped": false,
  "all_held": false
}
```

</details>


---

#### `PUT /v1/admin/kill-switch`

Admin or MD (MFA): set the kill-switch level (off, marketing, calls, text_only, hold); logged.

**Who:** admin, md (signed in with the authenticator app: `mfa=true`)

**Request body** (`application/json`): `KillSwitchIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `level` | `off` \| `marketing` \| `calls` \| `text_only` \| `hold` | yes |  |

<details><summary>Example request</summary>

```json
{
  "level": "off"
}
```

</details>

**Response 200:** `KillSwitchOut`

<details><summary>Example response 200</summary>

```json
{
  "level": "off",
  "marketing_stopped": false,
  "calls_stopped": false,
  "voice_stopped": false,
  "all_held": false
}
```

</details>


---

### admin: channels

#### `GET /v1/admin/channel-accounts`

§20.11 company WhatsApp numbers and email addresses, with the countries each number serves.

**Who:** admin, manager, md

**Response 200:** list of `ChannelAccountOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "channel": "<channel>",
    "provider": "<provider>",
    "display_name": "<display_name>",
    "address": "<address>",
    "purpose": "<purpose>",
    "status": "<status>",
    "region": "<region>",
    "countries": [
      "<countries>"
    ],
    "is_default": false,
    "created_at": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `PATCH /v1/admin/channel-accounts/{account_id}`

Regional routing for WhatsApp numbers: which countries a number serves, the default number.

**Who:** admin (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `account_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ChannelAccountPatch`

| Field | Type | Required | Notes |
|---|---|---|---|
| `display_name` | string or null | no |  |
| `region` | string or null | no |  |
| `countries` | list of string or null | no |  |
| `is_default` | boolean or null | no |  |
| `status` | `active` \| `disabled` or null | no |  |

<details><summary>Example request</summary>

```json
{
  "display_name": "<display_name>",
  "region": "<region>",
  "countries": [
    "<countries>"
  ],
  "is_default": false,
  "status": "active"
}
```

</details>

**Response 200:** `ChannelAccountOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "channel": "<channel>",
  "provider": "<provider>",
  "display_name": "<display_name>",
  "address": "<address>",
  "purpose": "<purpose>",
  "status": "<status>",
  "region": "<region>",
  "countries": [
    "<countries>"
  ],
  "is_default": false,
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `GET /v1/admin/message-templates`

§20.11 message templates and Meta's approval state, every version (the history), newest first; `live` marks the version being sent. `current_only=true`: the newest version of each template.

**Who:** admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `current_only` | query | boolean | no | default `false` |

**Response 200:** list of `TemplateOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "channel": "<channel>",
    "name": "Aisha Khan",
    "language": "en",
    "category": "<category>",
    "provider_status": "<provider_status>",
    "subject": "<subject>",
    "body": "<body>",
    "variables": [
      "<variables>"
    ],
    "version": 1,
    "provider_name": "<provider_name>",
    "live": false,
    "created_by": "<created_by>",
    "created_at": "2026-12-15T09:00:00+04:00",
    "updated_at": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `PUT /v1/admin/message-templates`

Add or change a template. Editing the live (approved) WhatsApp version creates a NEW version that waits for Meta under its own name; the approved one keeps sending until Meta approves the new one. A version not yet approved (draft, submitted, rejected) is changed in place. Email templates go live at once (no provider approval); the previous email version is kept as history.

**Who:** manager, md, admin (signed in with the authenticator app: `mfa=true`)

**Request body** (`application/json`): `TemplateIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `channel` | `whatsapp` \| `email` | yes |  |
| `name` | string | yes | pattern `^[a-z0-9_]{1,64}$` |
| `language` | string | yes | min length 2; max length 16 |
| `category` | `utility` \| `marketing` \| `authentication` \| `internal` | no | default `"utility"` |
| `subject` | string or null | no |  |
| `body` | string | yes | min length 1; max length 4000 |
| `variables` | list of string | no | max items 20 |

<details><summary>Example request</summary>

```json
{
  "channel": "whatsapp",
  "name": "Aisha Khan",
  "language": "en",
  "category": "utility",
  "subject": "<subject>",
  "body": "<body>",
  "variables": [
    "<variables>"
  ]
}
```

</details>

**Response 200:** `TemplateOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "channel": "<channel>",
  "name": "Aisha Khan",
  "language": "en",
  "category": "<category>",
  "provider_status": "<provider_status>",
  "subject": "<subject>",
  "body": "<body>",
  "variables": [
    "<variables>"
  ],
  "version": 1,
  "provider_name": "<provider_name>",
  "live": false,
  "created_by": "<created_by>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "updated_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/admin/message-templates/{template_id}/status`

Record Meta's decision on a WhatsApp template version. Approving it makes it the one that is sent; the version sent before becomes `superseded` (kept as history).

**Who:** manager, md, admin (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `template_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `TemplateStatusIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `provider_status` | `draft` \| `submitted` \| `approved` \| `rejected` \| `paused` \| `superseded` | yes |  |

<details><summary>Example request</summary>

```json
{
  "provider_status": "draft"
}
```

</details>

**Response 200:** `TemplateOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "channel": "<channel>",
  "name": "Aisha Khan",
  "language": "en",
  "category": "<category>",
  "provider_status": "<provider_status>",
  "subject": "<subject>",
  "body": "<body>",
  "variables": [
    "<variables>"
  ],
  "version": 1,
  "provider_name": "<provider_name>",
  "live": false,
  "created_by": "<created_by>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "updated_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

### auth

#### `POST /v1/auth/login`

Step 1: email + password. Answers the second steps on offer (TOTP first; email code fallback).

**Who:** public

**Request body** (`application/json`): `LoginIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |
| `password` | string | yes | min length 1; max length 256 |

<details><summary>Example request</summary>

```json
{
  "email": "qa.buyer@example.com",
  "password": "<password>"
}
```

</details>

**Response 200:** `ChallengeOut`

<details><summary>Example response 200</summary>

```json
{
  "challenge_token": "<challenge_token>",
  "methods": [
    "totp"
  ],
  "totp_enrolled": false,
  "expires_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/auth/mfa/totp`

Step 2 with the authenticator app: `mfa=true` (needed for approvals, price edits, settings).

**Who:** public

**Request body** (`application/json`): `CodeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `challenge_token` | string | yes | min length 10; max length 200 |
| `code` | string | yes | min length 6; max length 10 |

<details><summary>Example request</summary>

```json
{
  "challenge_token": "<challenge_token>",
  "code": "<code>"
}
```

</details>

**Response 200:** `TokenOut`

<details><summary>Example response 200</summary>

```json
{
  "access_token": "<access_token>",
  "token_type": "Bearer",
  "expires_in": 1,
  "mfa": false,
  "amr": [
    "<amr>"
  ],
  "must_change_password": false,
  "totp_enrolled": false,
  "user": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "email": "qa.buyer@example.com",
    "full_name": "<full_name>",
    "role": "<role>",
    "phone_e164": "+971500000001",
    "is_active": false,
    "is_away": false,
    "languages": [
      "en"
    ],
    "countries": [
      "<countries>"
    ],
    "category_codes": [
      "<category_codes>"
    ],
    "alert_channels": [
      "<alert_channels>"
    ]
  }
}
```

</details>


---

#### `POST /v1/auth/mfa/email/send`

Fallback second step: a 6-digit code to the staff member's work address (valid 10 minutes).

**Who:** public

**Request body** (`application/json`): `ChallengeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `challenge_token` | string | yes | min length 10; max length 200 |

<details><summary>Example request</summary>

```json
{
  "challenge_token": "<challenge_token>"
}
```

</details>

**Response 204:** (no body)

---

#### `POST /v1/auth/mfa/email/verify`

Step 2 with the email code: signed in with `mfa=false` (no approvals until TOTP is used).

**Who:** public

**Request body** (`application/json`): `CodeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `challenge_token` | string | yes | min length 10; max length 200 |
| `code` | string | yes | min length 6; max length 10 |

<details><summary>Example request</summary>

```json
{
  "challenge_token": "<challenge_token>",
  "code": "<code>"
}
```

</details>

**Response 200:** `TokenOut`

<details><summary>Example response 200</summary>

```json
{
  "access_token": "<access_token>",
  "token_type": "Bearer",
  "expires_in": 1,
  "mfa": false,
  "amr": [
    "<amr>"
  ],
  "must_change_password": false,
  "totp_enrolled": false,
  "user": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "email": "qa.buyer@example.com",
    "full_name": "<full_name>",
    "role": "<role>",
    "phone_e164": "+971500000001",
    "is_active": false,
    "is_away": false,
    "languages": [
      "en"
    ],
    "countries": [
      "<countries>"
    ],
    "category_codes": [
      "<category_codes>"
    ],
    "alert_channels": [
      "<alert_channels>"
    ]
  }
}
```

</details>


---

#### `POST /v1/auth/refresh`

A new access token. The refresh token rotates; a reused old one ends all the user's sessions.

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `kx_refresh` | cookie | string or null | no |  |

**Request body** (`application/json`): `RefreshIn` or null

<details><summary>Example request</summary>

```json
{
  "refresh_token": "<refresh_token>"
}
```

</details>

**Response 200:** `TokenOut`

<details><summary>Example response 200</summary>

```json
{
  "access_token": "<access_token>",
  "token_type": "Bearer",
  "expires_in": 1,
  "mfa": false,
  "amr": [
    "<amr>"
  ],
  "must_change_password": false,
  "totp_enrolled": false,
  "user": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "email": "qa.buyer@example.com",
    "full_name": "<full_name>",
    "role": "<role>",
    "phone_e164": "+971500000001",
    "is_active": false,
    "is_away": false,
    "languages": [
      "en"
    ],
    "countries": [
      "<countries>"
    ],
    "category_codes": [
      "<category_codes>"
    ],
    "alert_channels": [
      "<alert_channels>"
    ]
  }
}
```

</details>


---

#### `POST /v1/auth/logout`

End this session: the refresh token (cookie) and the session the access token names are revoked and the cookie cleared.

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `kx_refresh` | cookie | string or null | no |  |

**Response 204:** (no body)

---

#### `GET /v1/auth/me`

The signed-in staff member (name, role, languages, alert channels) for the screen header.

**Who:** any signed-in staff

**Response 200:** `StaffUserOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "email": "qa.buyer@example.com",
  "full_name": "<full_name>",
  "role": "<role>",
  "phone_e164": "+971500000001",
  "is_active": false,
  "is_away": false,
  "languages": [
    "en"
  ],
  "countries": [
    "<countries>"
  ],
  "category_codes": [
    "<category_codes>"
  ],
  "alert_channels": [
    "<alert_channels>"
  ]
}
```

</details>


---

#### `POST /v1/auth/totp/enrol`

A new authenticator seed for the signed-in user (active only after /totp/confirm). Replacing an active authenticator needs a TOTP sign-in (D4) and the user is told by email.

**Who:** any signed-in staff

**Response 200:** `TotpEnrolOut`

<details><summary>Example response 200</summary>

```json
{
  "secret": "<secret>",
  "otpauth_uri": "<otpauth_uri>"
}
```

</details>


---

#### `POST /v1/auth/totp/confirm`

The first code from the app switches TOTP on. Sign in again to get an MFA session.

**Who:** any signed-in staff

**Request body** (`application/json`): `TotpConfirmIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes | min length 6; max length 10 |

<details><summary>Example request</summary>

```json
{
  "code": "<code>"
}
```

</details>

**Response 204:** (no body)

---

#### `POST /v1/auth/password`

Change the password (ends every other session).

**Who:** any signed-in staff

**Request body** (`application/json`): `PasswordChangeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes | min length 1; max length 256 |
| `new_password` | string | yes | min length 12; max length 256 |

<details><summary>Example request</summary>

```json
{
  "current_password": "<current_password>",
  "new_password": "<new_password>"
}
```

</details>

**Response 204:** (no body)

---

#### `POST /v1/auth/password/reset/start`

Recovery: a code to the work address. Always 202 (nobody learns which addresses exist); 429 when the rate limit for this IP or this typed address is reached (the same for unknown addresses, M3). L6: the code is mailed after the response, so a real address answers as fast as an unknown one.

**Who:** public

**Request body** (`application/json`): `ResetStartIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |

<details><summary>Example request</summary>

```json
{
  "email": "qa.buyer@example.com"
}
```

</details>

**Response 202:** (no body)

---

#### `POST /v1/auth/password/reset/finish`

Recovery step 2: the emailed code + a new password (min 12 characters); every session ends.

**Who:** public

**Request body** (`application/json`): `ResetFinishIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |
| `code` | string | yes | min length 6; max length 10 |
| `new_password` | string | yes | min length 12; max length 256 |

<details><summary>Example request</summary>

```json
{
  "email": "qa.buyer@example.com",
  "code": "<code>",
  "new_password": "<new_password>"
}
```

</details>

**Response 204:** (no body)

---

#### `GET /.well-known/jwks.json`

The public key that verifies staff access tokens (RS256, D26).

**Who:** public

**Response 200:** object


---

### change-requests

#### `GET /v1/change-requests`

Open cards with SLA timers, oldest due first. A salesperson sees the cards of their own deals.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `status` | query | `open` \| `closed` | no | default `"open"` |
| `deal_id` | query | string (uuid) or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 200; default `100` |

**Response 200:** list of `ChangeRequestOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "type": "<type>",
    "buyer_text": "<buyer_text>",
    "buyer_text_en": "<buyer_text_en>",
    "fields": [
      {}
    ],
    "ai_notes": "<ai_notes>",
    "status": "<status>",
    "assigned_to": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "sla_due_at": "2026-12-15T09:00:00+04:00",
    "escalated_at": "2026-12-15T09:00:00+04:00",
    "resolved_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "decline_reason": "<decline_reason>",
    "created_at": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `GET /v1/change-requests/{cr_id}`

§13 change request card: what the buyer asked (their words), current vs requested values, SLA.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `cr_id` | path | string (uuid) | yes |  |

**Response 200:** `ChangeRequestOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "type": "<type>",
  "buyer_text": "<buyer_text>",
  "buyer_text_en": "<buyer_text_en>",
  "fields": [
    {}
  ],
  "ai_notes": "<ai_notes>",
  "status": "<status>",
  "assigned_to": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "sla_due_at": "2026-12-15T09:00:00+04:00",
  "escalated_at": "2026-12-15T09:00:00+04:00",
  "resolved_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "decline_reason": "<decline_reason>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/change-requests/{cr_id}/start`

Take the change request (starts work; the SLA keeps running).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `cr_id` | path | string (uuid) | yes |  |

**Response 200:** `ChangeRequestOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "type": "<type>",
  "buyer_text": "<buyer_text>",
  "buyer_text_en": "<buyer_text_en>",
  "fields": [
    {}
  ],
  "ai_notes": "<ai_notes>",
  "status": "<status>",
  "assigned_to": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "sla_due_at": "2026-12-15T09:00:00+04:00",
  "escalated_at": "2026-12-15T09:00:00+04:00",
  "resolved_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "decline_reason": "<decline_reason>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/change-requests/{cr_id}/revise`

"Revise quote": a new version with the edits; approving it resolves the card (§13.3-4).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `cr_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `QuoteEditsIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `lines` | list of `LineEditIn` | no | default `[]` |
| `delivery_time_text` | string or null | no |  |
| `delivery_place` | string or null | no |  |
| `incoterm` | `EXW` \| `FCA` \| `FOB` \| `CFR` \| `CIF` \| `CPT` \| `CIP` \| `DAP` \| `DDP` or null | no |  |
| `payment_terms_text` | string or null | no |  |
| `note` | string or null | no |  |
| `buyer_note` | string or null | no |  |
| `cover_note` | string or null | no |  |
| `currency` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "lines": [],
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "incoterm": "EXW",
  "payment_terms_text": "<payment_terms_text>",
  "note": "<note>",
  "buyer_note": "<buyer_note>",
  "cover_note": "<cover_note>",
  "currency": "AED"
}
```

</details>

**Response 201:** `QuoteVersionOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "version_no": 1,
  "kind": "<kind>",
  "status": "<status>",
  "currency": "AED",
  "subtotal": "<subtotal>",
  "vat_rate": "<vat_rate>",
  "vat_amount": "<vat_amount>",
  "total": "<total>",
  "total_aed": "<total_aed>",
  "incoterm": "<incoterm>",
  "validity_days": 1,
  "valid_until": "2026-12-15",
  "clauses": [
    "<clauses>"
  ],
  "approver_summary": "<approver_summary>",
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "payment_terms_text": "<payment_terms_text>",
  "fx_rate": "<fx_rate>",
  "fx_rate_date": "2026-12-15",
  "cover_note": "<cover_note>",
  "change_summary": "<change_summary>",
  "pdf_s3_key": "<pdf_s3_key>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "lines": []
}
```

</details>


---

#### `POST /v1/change-requests/{cr_id}/resolve`

Close the change request as done (a revised quote was sent or the answer given).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `cr_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ResolveIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `version_id` | string (uuid) | yes |  |

<details><summary>Example request</summary>

```json
{
  "version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
}
```

</details>

**Response 200:** `ChangeRequestOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "type": "<type>",
  "buyer_text": "<buyer_text>",
  "buyer_text_en": "<buyer_text_en>",
  "fields": [
    {}
  ],
  "ai_notes": "<ai_notes>",
  "status": "<status>",
  "assigned_to": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "sla_due_at": "2026-12-15T09:00:00+04:00",
  "escalated_at": "2026-12-15T09:00:00+04:00",
  "resolved_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "decline_reason": "<decline_reason>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/change-requests/{cr_id}/decline`

Decline the change request with a reason the buyer is told.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `cr_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `DeclineIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | yes | min length 1; max length 1000 |

<details><summary>Example request</summary>

```json
{
  "reason": "<reason>"
}
```

</details>

**Response 200:** `ChangeRequestOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "type": "<type>",
  "buyer_text": "<buyer_text>",
  "buyer_text_en": "<buyer_text_en>",
  "fields": [
    {}
  ],
  "ai_notes": "<ai_notes>",
  "status": "<status>",
  "assigned_to": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "sla_due_at": "2026-12-15T09:00:00+04:00",
  "escalated_at": "2026-12-15T09:00:00+04:00",
  "resolved_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "decline_reason": "<decline_reason>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

### company details

#### `GET /v1/company`

The company details printed on quotes and summaries, and what staff have set.

**Who:** admin, md, manager

**Response 200:** `CompanyOut`

<details><summary>Example response 200</summary>

```json
{
  "saved": {},
  "printed": {},
  "has_logo": false
}
```

</details>


---

#### `PATCH /v1/company`

Admin / MD / manager (MFA): change details; live on new quotes within 30 seconds. A change of bank details alerts the MD and the manager. 422 `invalid_company` lists the fields that are wrong (TRN 15 digits, IBAN checksum, SWIFT, email, phone).

**Who:** admin, md, manager (signed in with the authenticator app: `mfa=true`)

**Request body** (`application/json`): `kx__crm__api__company__CompanyIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string or null | no |  |
| `address` | string or null | no |  |
| `trn` | string or null | no |  |
| `phone` | string or null | no |  |
| `email` | string or null | no |  |
| `bank` | `BankIn` or null | no |  |

<details><summary>Example request</summary>

```json
{
  "name": "Aisha Khan",
  "address": "<address>",
  "trn": "<trn>",
  "phone": "+971500000001",
  "email": "qa.buyer@example.com",
  "bank": {
    "account_name": "<account_name>",
    "bank_name": "<bank_name>",
    "iban": "<iban>",
    "swift": "<swift>"
  }
}
```

</details>

**Response 200:** `CompanyOut`

<details><summary>Example response 200</summary>

```json
{
  "saved": {},
  "printed": {},
  "has_logo": false
}
```

</details>


---

#### `PUT /v1/company/logo`

Body: the PNG or JPEG file itself (`Content-Type: image/png` or `image/jpeg`), max 200 KB.

**Who:** admin, md, manager (signed in with the authenticator app: `mfa=true`)

**Response 200:** `CompanyOut`

<details><summary>Example response 200</summary>

```json
{
  "saved": {},
  "printed": {},
  "has_logo": false
}
```

</details>


---

#### `DELETE /v1/company/logo`

Remove the logo from quotes.

**Who:** admin, md, manager (signed in with the authenticator app: `mfa=true`)

**Response 200:** `CompanyOut`

<details><summary>Example response 200</summary>

```json
{
  "saved": {},
  "printed": {},
  "has_logo": false
}
```

</details>


---

### dashboards

#### `GET /v1/dashboards/salesperson`

§21 salesperson: my open deals by stage, items waiting for me, response times, sent and won.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `user_id` | query | string (uuid) or null | no |  |
| `period_from` | query | string (date) or null | no |  |
| `period_to` | query | string (date) or null | no |  |

**Response 200:** `SalespersonBoard`

<details><summary>Example response 200</summary>

```json
{
  "user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "name": "Aisha Khan",
  "open_deals_by_stage": {},
  "waiting_for_me": 1,
  "avg_response_minutes": 1,
  "quotes_sent": 1,
  "deals_won": 1
}
```

</details>


---

#### `GET /v1/dashboards/manager`

§21 manager: everyone's board, below-minimum requests, change requests by type, SLA breaches, price-list changes, plus opt-outs and the buyers' own reasons (§8.1).

**Who:** manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `period_from` | query | string (date) or null | no |  |
| `period_to` | query | string (date) or null | no |  |

**Response 200:** `ManagerBoard`

<details><summary>Example response 200</summary>

```json
{
  "period_from": "2026-12-15",
  "period_to": "2026-12-15",
  "salespeople": [
    {
      "user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "name": "Aisha Khan",
      "open_deals_by_stage": {},
      "waiting_for_me": 1,
      "avg_response_minutes": 1,
      "quotes_sent": 1,
      "deals_won": 1
    }
  ],
  "below_minimum_requests": 1,
  "change_requests_by_type": {},
  "sla_breaches": 1,
  "price_list_changes": 1,
  "opted_out": 1,
  "opt_out_reasons": {}
}
```

</details>


---

#### `GET /v1/dashboards/md`

§21 MD: pipeline by stage, win rate, average discount from list, deals by country / category / channel, top buyers, takeover queue.

**Who:** md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `period_from` | query | string (date) or null | no |  |
| `period_to` | query | string (date) or null | no |  |

**Response 200:** `MdBoard`

<details><summary>Example response 200</summary>

```json
{
  "period_from": "2026-12-15",
  "period_to": "2026-12-15",
  "pipeline_aed_by_stage": {},
  "win_rate": 1,
  "avg_discount_from_list": 1,
  "deals_by_country": {},
  "deals_by_category": {},
  "deals_by_channel": {},
  "top_buyers": [
    {}
  ],
  "takeover_queue": [
    "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  ]
}
```

</details>


---

#### `GET /v1/exports/{entity}`

§20.12: a list as CSV or XLSX (a salesperson exports only their own deals and orders; Admin / IT only the product list, L4: §3 gives it users, settings and the catalogue, not customer data).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `entity` | path | `deals` \| `contacts` \| `companies` \| `orders` \| `products` | yes |  |
| `format` | query | `csv` \| `xlsx` | no | default `"csv"` |

**Response 200:** (no body)

---

### deals

#### `GET /v1/deals`

§20.3 deals board: by stage, with filters for salesperson, country, product and value (the current quote's total in AED). §7A.3 team board: `unassigned=true`, `escalated=true`. A salesperson sees only their own (and covered) deals (§3).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `stage` | query | `DealStage` or null | no |  |
| `owner_user_id` | query | string (uuid) or null | no |  |
| `country` | query | string or null | no |  |
| `product_id` | query | string (uuid) or null | no |  |
| `sku` | query | string or null | no |  |
| `min_value_aed` | query | number or string or null | no |  |
| `max_value_aed` | query | number or string or null | no |  |
| `opted_out` | query | boolean or null | no |  |
| `unassigned` | query | boolean or null | no |  |
| `escalated` | query | boolean or null | no |  |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_DealSummary_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "number": "<number>",
      "stage": "NEW",
      "ai_enabled": false,
      "ai_paused_reason": "<ai_paused_reason>",
      "currency": "AED",
      "concessions_used": 1,
      "next_action_at": "2026-12-15T09:00:00+04:00",
      "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "opted_out_at": "2026-12-15T09:00:00+04:00",
      "version": 1,
      "updated_at": "2026-12-15T09:00:00+04:00"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `GET /v1/deals/{deal_id}`

§20.4 deal page: buyer, company, requirement, stage, AI state, AI summary (§7A.2), opt-out.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `GET /v1/deals/{deal_id}/timeline`

§20.4 full timeline: every message, call transcript, stage change and AI action (newest first).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_TimelineOut_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": 1,
      "kind": "<kind>",
      "channel": "<channel>",
      "direction": "<direction>",
      "summary": "<summary>",
      "actor_type": "<actor_type>",
      "actor_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "at": "2026-12-15T09:00:00+04:00"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `GET /v1/deals/{deal_id}/quotes`

§20.4 quote versions, newest first (the screen compares two side by side).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Response 200:** list of `QuoteVersionOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "quote_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "version_no": 1,
    "kind": "<kind>",
    "status": "<status>",
    "currency": "AED",
    "subtotal": "<subtotal>",
    "vat_rate": "<vat_rate>",
    "vat_amount": "<vat_amount>",
    "total": "<total>",
    "total_aed": "<total_aed>",
    "incoterm": "<incoterm>",
    "validity_days": 1,
    "valid_until": "2026-12-15",
    "clauses": [
      "<clauses>"
    ],
    "approver_summary": "<approver_summary>",
    "delivery_time_text": "<delivery_time_text>",
    "delivery_place": "<delivery_place>",
    "payment_terms_text": "<payment_terms_text>",
    "fx_rate": "<fx_rate>",
    "fx_rate_date": "2026-12-15",
    "cover_note": "<cover_note>",
    "change_summary": "<change_summary>",
    "pdf_s3_key": "<pdf_s3_key>",
    "created_at": "2026-12-15T09:00:00+04:00",
    "lines": []
  }
]
```

</details>


---

#### `POST /v1/deals/{deal_id}/quotes`

Ask the backend to build the quote from the price list (§11.1). The AI never prices; staff approve before anything is sent.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Response 201:** `QuoteVersionOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "version_no": 1,
  "kind": "<kind>",
  "status": "<status>",
  "currency": "AED",
  "subtotal": "<subtotal>",
  "vat_rate": "<vat_rate>",
  "vat_amount": "<vat_amount>",
  "total": "<total>",
  "total_aed": "<total_aed>",
  "incoterm": "<incoterm>",
  "validity_days": 1,
  "valid_until": "2026-12-15",
  "clauses": [
    "<clauses>"
  ],
  "approver_summary": "<approver_summary>",
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "payment_terms_text": "<payment_terms_text>",
  "fx_rate": "<fx_rate>",
  "fx_rate_date": "2026-12-15",
  "cover_note": "<cover_note>",
  "change_summary": "<change_summary>",
  "pdf_s3_key": "<pdf_s3_key>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "lines": []
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/stage`

Move the deal to another stage (rules in §5; LOST needs a reason). `expected_version` guards against overwriting a newer change (409).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `StageMoveIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `to` | `DealStage` | yes |  |
| `expected_version` | integer | yes |  |
| `reason` | string or null | no |  |
| `lost_reason` | `price_too_high` \| `delivery_not_suitable` \| `bought_competitor` \| `product_unavailable` \| `no_response_postponed` \| `budget` \| `duplicate` \| `other` \| `opted_out` or null | no |  |
| `lost_note` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "to": "NEW",
  "expected_version": 1,
  "reason": "<reason>",
  "lost_reason": "price_too_high",
  "lost_note": "<lost_note>"
}
```

</details>

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/quotes/revise`

§11.3 Edit then approve: a new version; below the minimum goes to the manager first (D3).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `QuoteEditsIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `lines` | list of `LineEditIn` | no | default `[]` |
| `delivery_time_text` | string or null | no |  |
| `delivery_place` | string or null | no |  |
| `incoterm` | `EXW` \| `FCA` \| `FOB` \| `CFR` \| `CIF` \| `CPT` \| `CIP` \| `DAP` \| `DDP` or null | no |  |
| `payment_terms_text` | string or null | no |  |
| `note` | string or null | no |  |
| `buyer_note` | string or null | no |  |
| `cover_note` | string or null | no |  |
| `currency` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "lines": [],
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "incoterm": "EXW",
  "payment_terms_text": "<payment_terms_text>",
  "note": "<note>",
  "buyer_note": "<buyer_note>",
  "cover_note": "<cover_note>",
  "currency": "AED"
}
```

</details>

**Response 201:** `QuoteVersionOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "version_no": 1,
  "kind": "<kind>",
  "status": "<status>",
  "currency": "AED",
  "subtotal": "<subtotal>",
  "vat_rate": "<vat_rate>",
  "vat_amount": "<vat_amount>",
  "total": "<total>",
  "total_aed": "<total_aed>",
  "incoterm": "<incoterm>",
  "validity_days": 1,
  "valid_until": "2026-12-15",
  "clauses": [
    "<clauses>"
  ],
  "approver_summary": "<approver_summary>",
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "payment_terms_text": "<payment_terms_text>",
  "fx_rate": "<fx_rate>",
  "fx_rate_date": "2026-12-15",
  "cover_note": "<cover_note>",
  "change_summary": "<change_summary>",
  "pdf_s3_key": "<pdf_s3_key>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "lines": []
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/ai`

Manager/MD takes over (AI off) or hands the conversation back (AI on).

**Who:** manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `AiToggleIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `enabled` | boolean | yes |  |
| `reason` | `human_takeover` \| `md_takeover` \| `opt_out` \| `exception` | no | default `"human_takeover"` |

<details><summary>Example request</summary>

```json
{
  "enabled": false,
  "reason": "human_takeover"
}
```

</details>

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/offer`

§12 below-minimum alert, manager (MFA): set an approved special price (may be below the range, D3); it becomes a price the AI may state, and `resume_ai` hands the chat back to the AI.

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ManagerOfferIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `unit_price` | number or string | yes |  |
| `resume_ai` | boolean | no | default `true` |

<details><summary>Example request</summary>

```json
{
  "unit_price": 1,
  "resume_ai": true
}
```

</details>

**Response 204:** (no body)

---

#### `POST /v1/deals/{deal_id}/reopen`

§7A.1 / D24: the manager (or MD) reopens a LOST deal to the stage it was lost from; the AI stays paused until a person resumes it.

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ReopenIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | yes | min length 1; max length 500 |

<details><summary>Example request</summary>

```json
{
  "reason": "<reason>"
}
```

</details>

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/personal-contact-shared`

§14 practical notes: record that the salesperson shared a personal contact with the buyer.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/messages`

§14 / D21: reply to the buyer on the same channel and company number, signed with the salesperson's name. Goes through the outbound gate (consent, opt-out, 24-hour rule); a price that is not in an approved quote is refused (422 `unapproved_price`). WhatsApp after 24 h of buyer silence answers 422 `window_closed`: send again with `reopen_template=true`. The AI stops replying.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `StaffMessageIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | no | max length 4000; default `""` |
| `client_key` | string | yes | min length 8; max length 80 |
| `channel` | `whatsapp` \| `email` or null | no |  |
| `reopen_template` | boolean | no | default `false` |

<details><summary>Example request</summary>

```json
{
  "text": "",
  "client_key": "<client_key>",
  "channel": "whatsapp",
  "reopen_template": false
}
```

</details>

**Response 202:** `StaffMessageOut`

<details><summary>Example response 202</summary>

```json
{
  "message_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/call`

§14: click-to-call through the company number. The salesperson's phone rings first, then the buyer; logged on the deal. Refused (422 `opt_out`) when the buyer asked not to be called.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `CallIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `client_key` | string | yes | min length 8; max length 80 |

<details><summary>Example request</summary>

```json
{
  "client_key": "<client_key>"
}
```

</details>

**Response 202:** `CallOut`

<details><summary>Example response 202</summary>

```json
{
  "call_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/opt-out`

§8.1 step 4: the salesperson records a stop (and the buyer's own reason, if given) after a conversation the buyer started. Same effect as a STOP: suppression list, queued follow-ups cancelled, Opted out badge, LOST proposed. Add only; a stop is never removed here.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `OptOutIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `scope` | `all` \| `whatsapp` \| `email` \| `phone` | no | default `"all"` |
| `words` | string | yes | what the buyer said, as close as possible min length 1; max length 2000 |
| `reason` | string or null | no | only a reason the buyer gave |

<details><summary>Example request</summary>

```json
{
  "scope": "all",
  "words": "<words>",
  "reason": "<reason>"
}
```

</details>

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/payments`

§15.1 / D20: the salesperson (human, MFA) confirms the advance; every detail is optional. The deal moves to PAYMENT.

**Who:** sales, manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `PaymentIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | number or string or null | no |  |
| `currency` | string or null | no |  |
| `method` | string or null | no |  |
| `reference` | string or null | no |  |
| `paid_on` | string (date) or null | no |  |
| `note` | string or null | no |  |
| `proof_s3_key` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "amount": 1,
  "currency": "AED",
  "method": "<method>",
  "reference": "<reference>",
  "paid_on": "2026-12-15",
  "note": "<note>",
  "proof_s3_key": "<proof_s3_key>"
}
```

</details>

**Response 201:** `PaymentOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "amount": "<amount>",
  "currency": "AED",
  "method": "<method>",
  "reference": "<reference>",
  "paid_on": "2026-12-15"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/won`

§15.2: WON (mandatory) with an optional expected re-order date; the order record is created.

**Who:** sales, manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `WonIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `expected_reorder_date` | string (date) or null | no |  |

<details><summary>Example request</summary>

```json
{
  "expected_reorder_date": "2026-12-15"
}
```

</details>

**Response 201:** `OrderOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "status": "<status>",
  "final_quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "expected_reorder_date": "2026-12-15"
}
```

</details>


---

#### `PATCH /v1/deals/orders/{order_id}`

§15.3 order tracking: in production -> ready -> shipped -> delivered (the buyer is told if configured). §3 / §5 step 14: the deal's salesperson (or the colleague covering them) updates it, as do the manager and the MD; cancelling an order is not in the SRS's salesperson list, so it stays with the manager / MD.

**Who:** sales, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `order_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `OrderStatusIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | `ready` \| `shipped` \| `delivered` \| `cancelled` | yes |  |
| `on_date` | string (date) or null | no |  |
| `tracking_ref` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "status": "ready",
  "on_date": "2026-12-15",
  "tracking_ref": "<tracking_ref>"
}
```

</details>

**Response 200:** `OrderOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "status": "<status>",
  "final_quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "expected_reorder_date": "2026-12-15"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/reassign`

§9.4: the manager or MD reassigns; both salespersons are notified, pending items follow.

**Who:** manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ReassignIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string (uuid) | yes |  |

<details><summary>Example request</summary>

```json
{
  "user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
}
```

</details>

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/takeover`

§3: the MD takes the deal over; the salesperson is read-only until hand-back.

**Who:** md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/handback`

End an MD or manager takeover: the salesperson can edit and approve again (§3).

**Who:** md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Response 200:** `DealDetail`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "number": "<number>",
  "stage": "NEW",
  "ai_enabled": false,
  "ai_paused_reason": "<ai_paused_reason>",
  "currency": "AED",
  "concessions_used": 1,
  "next_action_at": "2026-12-15T09:00:00+04:00",
  "owner_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "taken_over_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "opted_out_at": "2026-12-15T09:00:00+04:00",
  "version": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "contact": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "full_name": "<full_name>",
    "phone_e164": "+971500000001",
    "whatsapp_e164": "<whatsapp_e164>",
    "email": "qa.buyer@example.com",
    "preferred_channel": "<preferred_channel>",
    "language": "en",
    "timezone": "<timezone>",
    "phone_status": "unknown",
    "phone_status_at": "2026-12-15T09:00:00+04:00",
    "whatsapp_profile_name": "<whatsapp_profile_name>",
    "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
  },
  "requirements": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "product_text": "<product_text>",
      "spec": {},
      "quantity": "<quantity>",
      "unit": "<unit>",
      "delivery_country": "AE",
      "delivery_city": "<delivery_city>",
      "needed_by": "2026-12-15"
    }
  ],
  "missing_fields": [
    "<missing_fields>"
  ],
  "lost_reason": "<lost_reason>",
  "lost_note": "<lost_note>",
  "ai_summary": "<ai_summary>",
  "ai_summary_at": "2026-12-15T09:00:00+04:00",
  "personal_contact_shared_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `POST /v1/deals/{deal_id}/quotes/manual`

D8 / §23 scenario 5: a quote priced by hand by the salesperson, then approved as usual.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `deal_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ManualQuoteIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `lines` | list of `ManualLineIn` | yes | min items 1 |
| `delivery_time_text` | string or null | no |  |
| `buyer_note` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "lines": [
    {
      "description": "<description>",
      "quantity": 50000,
      "unit_price": 1,
      "unit": "pcs",
      "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
    }
  ],
  "delivery_time_text": "<delivery_time_text>",
  "buyer_note": "<buyer_note>"
}
```

</details>

**Response 201:** `QuoteVersionOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "version_no": 1,
  "kind": "<kind>",
  "status": "<status>",
  "currency": "AED",
  "subtotal": "<subtotal>",
  "vat_rate": "<vat_rate>",
  "vat_amount": "<vat_amount>",
  "total": "<total>",
  "total_aed": "<total_aed>",
  "incoterm": "<incoterm>",
  "validity_days": 1,
  "valid_until": "2026-12-15",
  "clauses": [
    "<clauses>"
  ],
  "approver_summary": "<approver_summary>",
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "payment_terms_text": "<payment_terms_text>",
  "fx_rate": "<fx_rate>",
  "fx_rate_date": "2026-12-15",
  "cover_note": "<cover_note>",
  "change_summary": "<change_summary>",
  "pdf_s3_key": "<pdf_s3_key>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "lines": []
}
```

</details>


---

### inbox

#### `GET /v1/inbox`

§20.2: approvals, change requests, below-minimum alerts, buyer messages on handed-over deals.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `limit` | query | integer | no | ≥ 1; ≤ 500; default `200` |

**Response 200:** list of `InboxItemOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "kind": "<kind>",
    "ref_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "deal_number": "<deal_number>",
    "title": "Aluminium Container & Lid",
    "due_at": "2026-12-15T09:00:00+04:00",
    "created_at": "2026-12-15T09:00:00+04:00",
    "overdue": false
  }
]
```

</details>


---

### message texts

#### `GET /v1/texts`

Every editable text: the English in use, the built-in English, its placeholders and the state of each language. Legal and opt-out wording is not here (not editable).

**Who:** manager, md, admin

**Response 200:** list of `TextOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "key": "<key>",
    "group": "<group>",
    "note": "<note>",
    "placeholders": [
      "<placeholders>"
    ],
    "builtin_en": "<builtin_en>",
    "en": "<en>",
    "en_version": 1,
    "updated_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "updated_at": "2026-12-15T09:00:00+04:00",
    "languages": [
      {
        "language": "en",
        "status": "<status>",
        "text": null
      }
    ]
  }
]
```

</details>


---

#### `PUT /v1/texts/{key}`

Manager / MD (MFA): new English text, live within 30 seconds; buyer and AI texts are then translated by the AI. 422 `invalid_text` when a placeholder is missing or added, or an amount with a currency is in it.

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Request body** (`application/json`): `TextIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | min length 1; max length 2000 |

<details><summary>Example request</summary>

```json
{
  "text": "Do you have 8325 containers with lids? I need 20,000 a month in Dubai."
}
```

</details>

**Response 200:** `TextOut`

<details><summary>Example response 200</summary>

```json
{
  "key": "<key>",
  "group": "<group>",
  "note": "<note>",
  "placeholders": [
    "<placeholders>"
  ],
  "builtin_en": "<builtin_en>",
  "en": "<en>",
  "en_version": 1,
  "updated_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "updated_at": "2026-12-15T09:00:00+04:00",
  "languages": [
    {
      "language": "en",
      "status": "<status>",
      "text": "Do you have 8325 containers with lids? I need 20,000 a month in Dubai."
    }
  ]
}
```

</details>


---

#### `POST /v1/texts/{key}/reset`

Manager / MD (MFA): back to the built-in wording in every language (the history keeps the edits).

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `key` | path | string | yes |  |

**Response 200:** `TextOut`

<details><summary>Example response 200</summary>

```json
{
  "key": "<key>",
  "group": "<group>",
  "note": "<note>",
  "placeholders": [
    "<placeholders>"
  ],
  "builtin_en": "<builtin_en>",
  "en": "<en>",
  "en_version": 1,
  "updated_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "updated_at": "2026-12-15T09:00:00+04:00",
  "languages": [
    {
      "language": "en",
      "status": "<status>",
      "text": "Do you have 8325 containers with lids? I need 20,000 a month in Dubai."
    }
  ]
}
```

</details>


---

#### `GET /v1/texts/{key}/history`

Every change of one text, newest first: who, when, old and new text (the MD's view).

**Who:** manager, md, admin

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `key` | path | string | yes |  |
| `limit` | query | integer | no | ≥ 1; ≤ 500; default `100` |

**Response 200:** list of `kx__crm__api__texts__ChangeOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "at": "2026-12-15T09:00:00+04:00",
    "actor_type": "<actor_type>",
    "actor_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "action": "<action>",
    "before": {},
    "after": {}
  }
]
```

</details>


---

#### `POST /v1/texts/translate-missing`

Manager / MD (MFA): queue AI translations for every text without one (built-in texts included).

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Response 200:** `QueuedOut`

<details><summary>Example response 200</summary>

```json
{
  "queued": 1
}
```

</details>


---

### price list

#### `GET /v1/products/{product_id}/price-tiers`

§20.7 price list: the quantity tiers of one product (list price and minimum per tier).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `product_id` | path | string (uuid) | yes |  |

**Response 200:** list of `PriceTierOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "min_qty": "<min_qty>",
    "max_qty": "<max_qty>",
    "list_price": "<list_price>",
    "min_price": "<min_price>",
    "currency": "AED",
    "valid_from": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `POST /v1/products/{product_id}/price-tiers`

Manager (MFA): add a quantity tier (every change is logged, §3).

**Who:** manager, admin, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `product_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `PriceTierIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `min_qty` | number or string | yes |  |
| `max_qty` | number or string or null | no |  |
| `list_price` | number or string | yes |  |
| `min_price` | number or string or null | no |  |
| `valid_from` | string (date-time) or null | no |  |

<details><summary>Example request</summary>

```json
{
  "min_qty": 50000,
  "max_qty": 50000,
  "list_price": 1,
  "min_price": 1,
  "valid_from": "2026-12-15T09:00:00+04:00"
}
```

</details>

**Response 201:** `PriceTierOut`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "min_qty": "<min_qty>",
  "max_qty": "<max_qty>",
  "list_price": "<list_price>",
  "min_price": "<min_price>",
  "currency": "AED",
  "valid_from": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `PATCH /v1/price-tiers/{tier_id}`

Manager (MFA): change a tier's prices or quantities (logged with old and new value).

**Who:** manager, admin, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `tier_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `PriceTierPatch`

| Field | Type | Required | Notes |
|---|---|---|---|
| `min_qty` | number or string or null | no |  |
| `max_qty` | number or string or null | no |  |
| `list_price` | number or string or null | no |  |
| `min_price` | number or string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "min_qty": 50000,
  "max_qty": 50000,
  "list_price": 1,
  "min_price": 1
}
```

</details>

**Response 200:** `PriceTierOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "min_qty": "<min_qty>",
  "max_qty": "<max_qty>",
  "list_price": "<list_price>",
  "min_price": "<min_price>",
  "currency": "AED",
  "valid_from": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `DELETE /v1/price-tiers/{tier_id}`

Manager (MFA): delete a tier (logged).

**Who:** manager, admin, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `tier_id` | path | string (uuid) | yes |  |

**Response 204:** (no body)

---

#### `POST /v1/price-list/import`

Body: the .xlsx file (columns sku, min_qty, max_qty, list_price, min_price, currency). All rows are validated first; any error saves nothing and returns the row errors (§10).

**Who:** manager, admin, md (signed in with the authenticator app: `mfa=true`)

**Response 200:** `ImportOut`

<details><summary>Example response 200</summary>

```json
{
  "saved": 1,
  "errors": [
    {
      "row": 1,
      "field": "<field>",
      "error": "<error>"
    }
  ]
}
```

</details>


---

#### `GET /v1/price-list/export`

Download the price list as Excel (the same layout the import accepts).

**Who:** sales, manager, admin, md

**Response 200:** (no body)

---

#### `GET /v1/products/{product_id}/history`

§20.7 change history of one product: its CRM-owned fields and its price tiers, newest first.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `product_id` | path | string (uuid) | yes |  |
| `limit` | query | integer | no | ≥ 1; ≤ 500; default `100` |

**Response 200:** list of `kx__crm__api__screens__ChangeOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "at": "2026-12-15T09:00:00+04:00",
    "actor_type": "<actor_type>",
    "actor_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "action": "<action>",
    "entity_type": "<entity_type>",
    "entity_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "before": {},
    "after": {}
  }
]
```

</details>


---

#### `GET /v1/price-list/history`

§20.7 change history of the whole price list (tier edits and Excel imports), newest first.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `limit` | query | integer | no | ≥ 1; ≤ 500; default `100` |

**Response 200:** list of `kx__crm__api__screens__ChangeOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "at": "2026-12-15T09:00:00+04:00",
    "actor_type": "<actor_type>",
    "actor_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "action": "<action>",
    "entity_type": "<entity_type>",
    "entity_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "before": {},
    "after": {}
  }
]
```

</details>


---

### product workbook

#### `GET /v1/catalogue/workbook`

Download the current catalogue (products, price tiers, categories, how-to sheet). Staff edit this file and upload it back; it contains minimum prices, so only manager / MD / admin get it.

**Who:** manager, md, admin (signed in with the authenticator app: `mfa=true`)

**Response 200:** (no body)

---

#### `POST /v1/catalogue/workbook/preview`

Body: the .xlsx file. Saves nothing: returns every change and every error (sheet, row, column), plus the `token` that `apply` needs.

**Who:** manager, md, admin (signed in with the authenticator app: `mfa=true`)

**Response 200:** `PreviewOut`

<details><summary>Example response 200</summary>

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIuLi4ifQ.signature",
  "ok": false,
  "summary": {
    "new_products": 1,
    "updated_products": 1,
    "unchanged_products": 1,
    "price_lists_changed": 1,
    "categories_changed": 1,
    "website_drafts": 1
  },
  "errors": [
    {
      "sheet": "<sheet>",
      "row": 1,
      "column": "<column>",
      "message": "<message>"
    }
  ],
  "warnings": [
    {
      "sheet": "<sheet>",
      "row": 1,
      "column": "<column>",
      "message": "<message>"
    }
  ],
  "products": [
    {
      "code": "<code>",
      "row": 1,
      "is_new": false,
      "changes": [
        null
      ],
      "website_draft": false
    }
  ],
  "price_lists": [
    {
      "code": "<code>",
      "before": [
        [
          null
        ]
      ],
      "after": [
        [
          null
        ]
      ]
    }
  ],
  "categories": [
    {
      "code": "<code>",
      "is_new": false,
      "changes": [
        null
      ]
    }
  ]
}
```

</details>


---

#### `POST /v1/catalogue/workbook/apply`

Body: the SAME .xlsx file as the preview; `token` from the preview. Saves everything or nothing. 409 when the catalogue changed since the preview (preview again); 422 when the file has errors.

**Who:** manager, md, admin (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `token` | query | string | yes | min length 64; max length 64 |

**Response 200:** `AppliedOut`

<details><summary>Example response 200</summary>

```json
{
  "products_created": 1,
  "products_updated": 1,
  "price_lists_changed": 1,
  "categories_changed": 1,
  "website_drafts": 1
}
```

</details>


---

#### `POST /v1/catalogue/erp-import`

D61: body = the ERP stock list (CSV or .xlsx with the columns Category, Item Description, Brand, Unit, OpnStk, In, Out, ClosStk). Every row is kept (packing and raw material too, marked not sellable); codes are made from description + unit; closing stock is saved; new sellable items are linked to their website product where it is safe. Prices are never touched. `dry_run=true` shows what would change and saves nothing.

**Who:** manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `dry_run` | query | boolean | no | default `false` |

**Response 200:** `ErpImportOut`

<details><summary>Example response 200</summary>

```json
{
  "rows": 1,
  "created": 1,
  "updated": 1,
  "sellable": 1,
  "not_sellable": 1,
  "linked_to_website": 1,
  "ambiguous_links": 1,
  "errors": [
    "<errors>"
  ],
  "saved": false
}
```

</details>


---

#### `PUT /v1/catalogue/products/{sku}/website-link`

Link an ERP item (a variant) to its website product, or unlink it (null): when the automatic match was not sure, or was wrong.

**Who:** manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `sku` | path | string | yes |  |

**Request body** (`application/json`): `WebsiteLinkIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `cms_product_id` | string or null | yes |  |

<details><summary>Example request</summary>

```json
{
  "cms_product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12"
}
```

</details>

**Response 204:** (no body)

---

#### `GET /v1/catalogue/website-products/{cms_product_id}/variants`

The sellable variants of a website product, as the AI describes them (availability word, the quantities where a better price starts; no amounts).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `cms_product_id` | path | string | yes |  |

**Response 200:** list of `VariantOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "sku": "<sku>",
    "description": "<description>",
    "packing": "<packing>",
    "unit": "<unit>",
    "availability": "<availability>",
    "moq": 1,
    "quantity_breaks": [
      "<quantity_breaks>"
    ],
    "quotable": false
  }
]
```

</details>


---

### quotes

#### `GET /v1/quote-versions/{version_id}`

§11.3 quote approval screen: one quote version with its lines, terms, delivery and totals.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `version_id` | path | string (uuid) | yes |  |

**Response 200:** `QuoteVersionOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "version_no": 1,
  "kind": "<kind>",
  "status": "<status>",
  "currency": "AED",
  "subtotal": "<subtotal>",
  "vat_rate": "<vat_rate>",
  "vat_amount": "<vat_amount>",
  "total": "<total>",
  "total_aed": "<total_aed>",
  "incoterm": "<incoterm>",
  "validity_days": 1,
  "valid_until": "2026-12-15",
  "clauses": [
    "<clauses>"
  ],
  "approver_summary": "<approver_summary>",
  "delivery_time_text": "<delivery_time_text>",
  "delivery_place": "<delivery_place>",
  "payment_terms_text": "<payment_terms_text>",
  "fx_rate": "<fx_rate>",
  "fx_rate_date": "2026-12-15",
  "cover_note": "<cover_note>",
  "change_summary": "<change_summary>",
  "pdf_s3_key": "<pdf_s3_key>",
  "created_at": "2026-12-15T09:00:00+04:00",
  "lines": []
}
```

</details>


---

#### `GET /v1/quote-versions/{version_id}/costs`

Cost build-up of each line: MD only (T3).

**Who:** md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `version_id` | path | string (uuid) | yes |  |

**Response 200:** list of `LineCostOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "line_no": 1,
    "material_rate": "<material_rate>",
    "kg_per_1000": "<kg_per_1000>",
    "yield_pct": "<yield_pct>",
    "production_per_1000": "<production_per_1000>",
    "packaging_per_1000": "<packaging_per_1000>",
    "freight_per_1000": "<freight_per_1000>",
    "unit_cost": "<unit_cost>",
    "markup_pct": "<markup_pct>",
    "markup_min_pct": "<markup_min_pct>",
    "markup_max_pct": "<markup_max_pct>"
  }
]
```

</details>


---

#### `GET /v1/approvals`

Manager / MD: approvals open (with SLA deadlines, §16) or decided. Salespeople see theirs in the inbox.

**Who:** manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `status` | query | `open` \| `decided` | no | default `"open"` |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_ApprovalOut_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "kind": "<kind>",
      "required_role": "<required_role>",
      "assigned_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "approver_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "status": "<status>",
      "submitted_at": "2026-12-15T09:00:00+04:00",
      "deadline_at": "2026-12-15T09:00:00+04:00",
      "decided_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "decided_at": "2026-12-15T09:00:00+04:00",
      "decision_note": "<decision_note>"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `POST /v1/approvals/{approval_id}/decision`

Human + MFA only. Whose deal it is, takeover and special price are checked in the service.

**Who:** sales, manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `approval_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `DecisionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `decision` | `approve` \| `reject` \| `correct` | yes |  |
| `note` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "decision": "approve",
  "note": "<note>"
}
```

</details>

**Response 200:** `ApprovalOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "quote_version_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "kind": "<kind>",
  "required_role": "<required_role>",
  "assigned_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "approver_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "status": "<status>",
  "submitted_at": "2026-12-15T09:00:00+04:00",
  "deadline_at": "2026-12-15T09:00:00+04:00",
  "decided_by": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "decided_at": "2026-12-15T09:00:00+04:00",
  "decision_note": "<decision_note>"
}
```

</details>


---

### records

#### `GET /v1/contacts`

Search by name, email or phone digits. A salesperson sees the contacts of their own deals.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `q` | query | string or null | no |  |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_ContactRow_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "full_name": "<full_name>",
      "designation": "<designation>",
      "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "phone_e164": "+971500000001",
      "whatsapp_e164": "<whatsapp_e164>",
      "email": "qa.buyer@example.com",
      "preferred_channel": "<preferred_channel>",
      "language": "en",
      "timezone": "<timezone>",
      "phone_status": "+971500000001",
      "source": "<source>",
      "created_at": "2026-12-15T09:00:00+04:00"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `GET /v1/contacts/{contact_id}`

§20.6 one contact (a salesperson only for contacts of their own deals).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `contact_id` | path | string (uuid) | yes |  |

**Response 200:** `ContactRow`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "full_name": "<full_name>",
  "designation": "<designation>",
  "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "phone_e164": "+971500000001",
  "whatsapp_e164": "<whatsapp_e164>",
  "email": "qa.buyer@example.com",
  "preferred_channel": "<preferred_channel>",
  "language": "en",
  "timezone": "<timezone>",
  "phone_status": "+971500000001",
  "source": "<source>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `PATCH /v1/contacts/{contact_id}`

Edit name, designation, company, preferred channel, language, time zone (phone / email change through the deal).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `contact_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ContactEditIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | string or null | no |  |
| `designation` | string or null | no |  |
| `company_id` | string (uuid) or null | no |  |
| `preferred_channel` | `whatsapp` \| `email` \| `phone` or null | no |  |
| `language` | string or null | no |  |
| `timezone` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "full_name": "<full_name>",
  "designation": "<designation>",
  "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "preferred_channel": "whatsapp",
  "language": "en",
  "timezone": "<timezone>"
}
```

</details>

**Response 200:** `ContactRow`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "full_name": "<full_name>",
  "designation": "<designation>",
  "company_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "phone_e164": "+971500000001",
  "whatsapp_e164": "<whatsapp_e164>",
  "email": "qa.buyer@example.com",
  "preferred_channel": "<preferred_channel>",
  "language": "en",
  "timezone": "<timezone>",
  "phone_status": "+971500000001",
  "source": "<source>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `GET /v1/companies`

§20.6 companies: search by name, newest first. A salesperson sees the companies of their own deals' contacts and companies nobody is linked to yet (L3).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `q` | query | string or null | no |  |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_CompanyRow_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "name": "Aisha Khan",
      "country_code": "AE",
      "city": "Dubai",
      "customer_type": "<customer_type>",
      "vat_trn": "<vat_trn>",
      "website": "<website>",
      "notes": "<notes>",
      "created_at": "2026-12-15T09:00:00+04:00"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `POST /v1/companies`

Create a company record.

**Who:** sales, manager, admin, md

**Request body** (`application/json`): `kx__crm__api__records__CompanyIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | min length 1; max length 300 |
| `country_code` | string or null | no |  |
| `city` | string or null | no |  |
| `customer_type` | `distributor` \| `restaurant_chain` \| `caterer` \| `airline` \| `retailer` \| `manufacturer` \| `other` or null | no |  |
| `vat_trn` | string or null | no |  |
| `website` | string or null | no |  |
| `notes` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "name": "Aisha Khan",
  "country_code": "AE",
  "city": "Dubai",
  "customer_type": "distributor",
  "vat_trn": "<vat_trn>",
  "website": "<website>",
  "notes": "<notes>"
}
```

</details>

**Response 201:** `CompanyRow`

<details><summary>Example response 201</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "name": "Aisha Khan",
  "country_code": "AE",
  "city": "Dubai",
  "customer_type": "<customer_type>",
  "vat_trn": "<vat_trn>",
  "website": "<website>",
  "notes": "<notes>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `PATCH /v1/companies/{company_id}`

Edit a company record (logged); a salesperson only a company they may see (L3).

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `company_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `kx__crm__api__records__CompanyIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | min length 1; max length 300 |
| `country_code` | string or null | no |  |
| `city` | string or null | no |  |
| `customer_type` | `distributor` \| `restaurant_chain` \| `caterer` \| `airline` \| `retailer` \| `manufacturer` \| `other` or null | no |  |
| `vat_trn` | string or null | no |  |
| `website` | string or null | no |  |
| `notes` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "name": "Aisha Khan",
  "country_code": "AE",
  "city": "Dubai",
  "customer_type": "distributor",
  "vat_trn": "<vat_trn>",
  "website": "<website>",
  "notes": "<notes>"
}
```

</details>

**Response 200:** `CompanyRow`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "name": "Aisha Khan",
  "country_code": "AE",
  "city": "Dubai",
  "customer_type": "<customer_type>",
  "vat_trn": "<vat_trn>",
  "website": "<website>",
  "notes": "<notes>",
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `GET /v1/products`

§20.7 product catalogue with the CRM-owned fields (MOQ, lead time, quotable) and CMS sync state.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `category` | query | string or null | no |  |
| `quotable` | query | boolean or null | no |  |

**Response 200:** list of `ProductRow`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "sku": "<sku>",
    "name": "Aisha Khan",
    "category_code": "<category_code>",
    "unit": "<unit>",
    "moq": 1,
    "carton_qty": 50000,
    "is_active": false,
    "is_quotable": false,
    "custom_printing": false,
    "default_lead_days_min": 1,
    "default_lead_days_max": 1,
    "spec": {},
    "cms_product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "cms_published": false,
    "cms_synced_at": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `GET /v1/products/{product_id}`

One product with its specification (from the CMS) and CRM-owned fields.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `product_id` | path | string (uuid) | yes |  |

**Response 200:** `ProductRow`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "sku": "<sku>",
  "name": "Aisha Khan",
  "category_code": "<category_code>",
  "unit": "<unit>",
  "moq": 1,
  "carton_qty": 50000,
  "is_active": false,
  "is_quotable": false,
  "custom_printing": false,
  "default_lead_days_min": 1,
  "default_lead_days_max": 1,
  "spec": {},
  "cms_product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "cms_published": false,
  "cms_synced_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `PATCH /v1/products/{product_id}`

Manager (MFA): MOQ for quoting, default delivery time, quotable/active (D22: CRM-owned fields).

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `product_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `ProductEditIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `moq` | integer or null | no |  |
| `carton_qty` | integer or null | no |  |
| `unit` | string or null | no |  |
| `is_active` | boolean or null | no |  |
| `is_quotable` | boolean or null | no |  |
| `default_lead_days_min` | integer or null | no |  |
| `default_lead_days_max` | integer or null | no |  |

<details><summary>Example request</summary>

```json
{
  "moq": 1,
  "carton_qty": 50000,
  "unit": "<unit>",
  "is_active": false,
  "is_quotable": false,
  "default_lead_days_min": 1,
  "default_lead_days_max": 1
}
```

</details>

**Response 200:** `ProductRow`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "sku": "<sku>",
  "name": "Aisha Khan",
  "category_code": "<category_code>",
  "unit": "<unit>",
  "moq": 1,
  "carton_qty": 50000,
  "is_active": false,
  "is_quotable": false,
  "custom_printing": false,
  "default_lead_days_min": 1,
  "default_lead_days_max": 1,
  "spec": {},
  "cms_product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "cms_published": false,
  "cms_synced_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `GET /v1/orders`

§20.9 orders (a salesperson: their own deals), newest first.

**Who:** sales, manager, admin, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `status` | query | string or null | no |  |
| `cursor` | query | string or null | no |  |
| `limit` | query | integer | no | ≥ 1; ≤ 100; default `50` |

**Response 200:** `Page_OrderRow_`

<details><summary>Example response 200</summary>

```json
{
  "items": [
    {
      "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "number": "<number>",
      "deal_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
      "status": "<status>",
      "production_started_on": "2026-12-15",
      "ready_on": "2026-12-15",
      "shipped_on": "2026-12-15",
      "delivered_on": "2026-12-15",
      "tracking_ref": "<tracking_ref>",
      "created_at": "2026-12-15T09:00:00+04:00"
    }
  ],
  "next_cursor": "<next_cursor>"
}
```

</details>


---

#### `GET /v1/fx-rates`

The latest rate per currency (the one quotes use).

**Who:** manager, md

**Response 200:** list of `FxRow`

<details><summary>Example response 200</summary>

```json
[
  {
    "currency": "AED",
    "rate_to_aed": "<rate_to_aed>",
    "as_of": "2026-12-15",
    "source": "<source>"
  }
]
```

</details>


---

#### `POST /v1/fx-rates`

D38 "the manager can override": a manual rate for a day (it replaces that day's rate).

**Who:** manager, md (signed in with the authenticator app: `mfa=true`)

**Request body** (`application/json`): `FxIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `currency` | string | yes | pattern `^[A-Z]{3}$` |
| `rate_to_aed` | number or string | yes |  |
| `as_of` | string (date) | yes |  |

<details><summary>Example request</summary>

```json
{
  "currency": "AED",
  "rate_to_aed": 1,
  "as_of": "2026-12-15"
}
```

</details>

**Response 201:** `FxRow`

<details><summary>Example response 201</summary>

```json
{
  "currency": "AED",
  "rate_to_aed": "<rate_to_aed>",
  "as_of": "2026-12-15",
  "source": "<source>"
}
```

</details>


---

### stock

#### `GET /v1/stock`

§20.8 stock table: quantity on hand per product or material.

**Who:** sales, manager, admin, md

**Response 200:** list of `StockOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "item_type": "<item_type>",
    "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "material_code": "<material_code>",
    "quantity": "<quantity>",
    "reserved_quantity": "<reserved_quantity>",
    "unit": "<unit>"
  }
]
```

</details>


---

#### `PUT /v1/stock`

Manager or admin: set the quantity on hand of a product or material (logged).

**Who:** manager, admin, md

**Request body** (`application/json`): `StockIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_id` | string (uuid) or null | no |  |
| `material_code` | string or null | no |  |
| `quantity` | number or string | yes |  |
| `unit` | string | no | default `"pcs"` |

<details><summary>Example request</summary>

```json
{
  "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "material_code": "<material_code>",
  "quantity": 50000,
  "unit": "pcs"
}
```

</details>

**Response 200:** `StockOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "item_type": "<item_type>",
  "product_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "material_code": "<material_code>",
  "quantity": "<quantity>",
  "reserved_quantity": "<reserved_quantity>",
  "unit": "<unit>"
}
```

</details>


---

### users

#### `GET /v1/users`

§20.11 users and roles: every staff member with MFA enrolment and lock state.

**Who:** admin, manager, md

**Response 200:** list of `UserAdminOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "email": "qa.buyer@example.com",
    "full_name": "<full_name>",
    "role": "<role>",
    "phone_e164": "+971500000001",
    "is_active": false,
    "is_away": false,
    "languages": [
      "en"
    ],
    "countries": [
      "<countries>"
    ],
    "category_codes": [
      "<category_codes>"
    ],
    "alert_channels": [
      "<alert_channels>"
    ],
    "backup_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "totp_enrolled": false,
    "locked": false
  }
]
```

</details>


---

#### `POST /v1/users`

Admin (MFA): a new staff user; the one-time password in the answer is shown once.

**Who:** admin, md (signed in with the authenticator app: `mfa=true`)

**Request body** (`application/json`): `UserCreateIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |
| `full_name` | string | yes | min length 1; max length 200 |
| `role` | `md` \| `manager` \| `admin` \| `sales` \| `content_editor` | yes |  |
| `phone_e164` | string or null | no |  |
| `break_glass` | boolean | no | default `false` |

<details><summary>Example request</summary>

```json
{
  "email": "qa.buyer@example.com",
  "full_name": "<full_name>",
  "role": "md",
  "phone_e164": "+971500000001",
  "break_glass": false
}
```

</details>

**Response 201:** `UserCreatedOut`

<details><summary>Example response 201</summary>

```json
{
  "user": {
    "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
    "email": "qa.buyer@example.com",
    "full_name": "<full_name>",
    "role": "<role>",
    "phone_e164": "+971500000001",
    "is_active": false,
    "is_away": false,
    "languages": [
      "en"
    ],
    "countries": [
      "<countries>"
    ],
    "category_codes": [
      "<category_codes>"
    ],
    "alert_channels": [
      "<alert_channels>"
    ]
  },
  "temporary_password": "<temporary_password>"
}
```

</details>


---

#### `PATCH /v1/users/{user_id}`

Admin (MFA): role, active flag, phone, languages / countries / categories for assignment (§9), alert channels.

**Who:** admin, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `user_id` | path | string (uuid) | yes |  |

**Request body** (`application/json`): `UserPatchIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | string or null | no |  |
| `role` | `md` \| `manager` \| `admin` \| `sales` \| `content_editor` or null | no |  |
| `phone_e164` | string or null | no |  |
| `is_active` | boolean or null | no |  |
| `languages` | list of string or null | no |  |
| `countries` | list of string or null | no |  |
| `category_codes` | list of string or null | no |  |
| `alert_channels` | list of `whatsapp` \| `email` \| `call` \| `in_app` or null | no |  |

<details><summary>Example request</summary>

```json
{
  "full_name": "<full_name>",
  "role": "md",
  "phone_e164": "+971500000001",
  "is_active": false,
  "languages": [
    "en"
  ],
  "countries": [
    "<countries>"
  ],
  "category_codes": [
    "<category_codes>"
  ],
  "alert_channels": [
    "whatsapp"
  ]
}
```

</details>

**Response 200:** `UserAdminOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "email": "qa.buyer@example.com",
  "full_name": "<full_name>",
  "role": "<role>",
  "phone_e164": "+971500000001",
  "is_active": false,
  "is_away": false,
  "languages": [
    "en"
  ],
  "countries": [
    "<countries>"
  ],
  "category_codes": [
    "<category_codes>"
  ],
  "alert_channels": [
    "<alert_channels>"
  ],
  "backup_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "totp_enrolled": false,
  "locked": false
}
```

</details>


---

#### `POST /v1/users/{user_id}/reset-mfa`

A lost authenticator: sessions end; the person signs in with an email code and enrols again.

**Who:** admin, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `user_id` | path | string (uuid) | yes |  |

**Response 200:** `UserAdminOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "email": "qa.buyer@example.com",
  "full_name": "<full_name>",
  "role": "<role>",
  "phone_e164": "+971500000001",
  "is_active": false,
  "is_away": false,
  "languages": [
    "en"
  ],
  "countries": [
    "<countries>"
  ],
  "category_codes": [
    "<category_codes>"
  ],
  "alert_channels": [
    "<alert_channels>"
  ],
  "backup_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "totp_enrolled": false,
  "locked": false
}
```

</details>


---

#### `POST /v1/users/{user_id}/unlock`

Admin (MFA): lift a lock-out after too many wrong passwords or codes.

**Who:** admin, md (signed in with the authenticator app: `mfa=true`)

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `user_id` | path | string (uuid) | yes |  |

**Response 200:** `UserAdminOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "email": "qa.buyer@example.com",
  "full_name": "<full_name>",
  "role": "<role>",
  "phone_e164": "+971500000001",
  "is_active": false,
  "is_away": false,
  "languages": [
    "en"
  ],
  "countries": [
    "<countries>"
  ],
  "category_codes": [
    "<category_codes>"
  ],
  "alert_channels": [
    "<alert_channels>"
  ],
  "backup_user_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "totp_enrolled": false,
  "locked": false
}
```

</details>


---

## CRM endpoint reference: data shapes

### `AiToggleIn`

Pause the AI (any reason) or resume it. A deal paused for `opt_out` cannot be resumed here: the AI may never remove a stop (§8.1 step 6); only a fresh, logged consent from the buyer lifts it.

| Field | Type | Required | Notes |
|---|---|---|---|
| `enabled` | boolean | yes |  |
| `reason` | `human_takeover` \| `md_takeover` \| `opt_out` \| `exception` | no | default `"human_takeover"` |

### `AppliedOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `products_created` | integer | yes |  |
| `products_updated` | integer | yes |  |
| `price_lists_changed` | integer | yes |  |
| `categories_changed` | integer | yes |  |
| `website_drafts` | integer | yes |  |

### `ApprovalOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `quote_version_id` | string (uuid) | yes |  |
| `kind` | string | yes |  |
| `required_role` | string | yes |  |
| `assigned_user_id` | string (uuid) or null | yes |  |
| `approver_user_id` | string (uuid) or null | no |  |
| `status` | string | yes |  |
| `submitted_at` | string (date-time) | yes |  |
| `deadline_at` | string (date-time) | yes |  |
| `decided_by` | string (uuid) or null | yes |  |
| `decided_at` | string (date-time) or null | yes |  |
| `decision_note` | string or null | yes |  |

### `AvailabilityIn`

§9.3 away / holiday and the backup who covers.

| Field | Type | Required | Notes |
|---|---|---|---|
| `is_away` | boolean | yes |  |
| `backup_user_id` | string (uuid) or null | no |  |

### `BankIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `account_name` | string or null | no |  |
| `bank_name` | string or null | no |  |
| `iban` | string or null | no |  |
| `swift` | string or null | no |  |

### `CallIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `client_key` | string | yes | min length 8; max length 80 |

### `CallOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `call_id` | string (uuid) | yes |  |

### `CategoryChangeOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |
| `is_new` | boolean | yes |  |
| `changes` | list of `FieldChangeOut` | yes |  |

### `ChallengeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `challenge_token` | string | yes | min length 10; max length 200 |

### `ChallengeOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `challenge_token` | string | yes |  |
| `methods` | list of `totp` \| `email` | yes |  |
| `totp_enrolled` | boolean | yes |  |
| `expires_at` | string (date-time) | yes |  |

### `ChangeRequestOut`

The §13.2 card: the buyer's words, what changes, the SLA timer.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `deal_id` | string (uuid) | yes |  |
| `quote_version_id` | string (uuid) or null | yes |  |
| `type` | string | yes |  |
| `buyer_text` | string | yes |  |
| `buyer_text_en` | string or null | yes |  |
| `fields` | list of object | yes |  |
| `ai_notes` | string or null | yes |  |
| `status` | string | yes |  |
| `assigned_to` | string (uuid) or null | yes |  |
| `sla_due_at` | string (date-time) | yes |  |
| `escalated_at` | string (date-time) or null | yes |  |
| `resolved_version_id` | string (uuid) or null | yes |  |
| `decline_reason` | string or null | yes |  |
| `created_at` | string (date-time) | yes |  |

### `ChannelAccountOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `channel` | string | yes |  |
| `provider` | string | yes |  |
| `display_name` | string | yes |  |
| `address` | string | yes |  |
| `purpose` | string | yes |  |
| `status` | string | yes |  |
| `region` | string or null | yes |  |
| `countries` | list of string | yes |  |
| `is_default` | boolean | yes |  |
| `created_at` | string (date-time) | yes |  |

### `ChannelAccountPatch`

| Field | Type | Required | Notes |
|---|---|---|---|
| `display_name` | string or null | no |  |
| `region` | string or null | no |  |
| `countries` | list of string or null | no |  |
| `is_default` | boolean or null | no |  |
| `status` | `active` \| `disabled` or null | no |  |

### `CodeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `challenge_token` | string | yes | min length 10; max length 200 |
| `code` | string | yes | min length 6; max length 10 |

### `CompanyOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `saved` | object | yes |  |
| `printed` | object | yes |  |
| `has_logo` | boolean | yes |  |

### `CompanyRow`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `name` | string | yes |  |
| `country_code` | string or null | yes |  |
| `city` | string or null | yes |  |
| `customer_type` | string or null | yes |  |
| `vat_trn` | string or null | yes |  |
| `website` | string or null | yes |  |
| `notes` | string or null | yes |  |
| `created_at` | string (date-time) | yes |  |

### `ContactEditIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | string or null | no |  |
| `designation` | string or null | no |  |
| `company_id` | string (uuid) or null | no |  |
| `preferred_channel` | `whatsapp` \| `email` \| `phone` or null | no |  |
| `language` | string or null | no |  |
| `timezone` | string or null | no |  |

### `ContactOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `full_name` | string or null | yes |  |
| `phone_e164` | string or null | yes |  |
| `whatsapp_e164` | string or null | yes |  |
| `email` | string or null | yes |  |
| `preferred_channel` | string or null | yes |  |
| `language` | string | yes |  |
| `timezone` | string | yes |  |
| `phone_status` | string | no | default `"unknown"` |
| `phone_status_at` | string (date-time) or null | no |  |
| `whatsapp_profile_name` | string or null | no |  |
| `company_id` | string (uuid) or null | no |  |

### `ContactRow`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `full_name` | string or null | yes |  |
| `designation` | string or null | yes |  |
| `company_id` | string (uuid) or null | yes |  |
| `phone_e164` | string or null | yes |  |
| `whatsapp_e164` | string or null | yes |  |
| `email` | string or null | yes |  |
| `preferred_channel` | string or null | yes |  |
| `language` | string | yes |  |
| `timezone` | string | yes |  |
| `phone_status` | string | yes |  |
| `source` | string | yes |  |
| `created_at` | string (date-time) | yes |  |

### `DashboardSummary`

| Field | Type | Required | Notes |
|---|---|---|---|
| `deals_by_stage` | map of integer | yes |  |
| `open_pipeline_aed` | string | yes |  |
| `approvals_pending` | integer | yes |  |
| `approvals_overdue` | integer | yes |  |
| `open_tasks` | integer | yes |  |
| `ai_paused_deals` | integer | yes |  |
| `materials` | list of `FreshnessOut` | yes |  |

### `DealDetail`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `number` | string | yes |  |
| `stage` | `DealStage` | yes |  |
| `ai_enabled` | boolean | yes |  |
| `ai_paused_reason` | string or null | yes |  |
| `currency` | string | yes |  |
| `concessions_used` | integer | yes |  |
| `next_action_at` | string (date-time) or null | yes |  |
| `owner_user_id` | string (uuid) or null | yes |  |
| `taken_over_by` | string (uuid) or null | no |  |
| `opted_out_at` | string (date-time) or null | no |  |
| `version` | integer | yes |  |
| `updated_at` | string (date-time) | yes |  |
| `contact` | `ContactOut` | yes |  |
| `requirements` | list of `RequirementOut` | yes |  |
| `missing_fields` | list of string | yes |  |
| `lost_reason` | string or null | yes |  |
| `lost_note` | string or null | yes |  |
| `ai_summary` | string or null | no |  |
| `ai_summary_at` | string (date-time) or null | no |  |
| `personal_contact_shared_at` | string (date-time) or null | no |  |

### `DealStage`

One of: `NEW`, `QUALIFIED`, `QUOTATION`, `NEGOTIATION`, `READY_TO_CLOSE`, `PAYMENT`, `WON`, `LOST`

### `DealSummary`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `number` | string | yes |  |
| `stage` | `DealStage` | yes |  |
| `ai_enabled` | boolean | yes |  |
| `ai_paused_reason` | string or null | yes |  |
| `currency` | string | yes |  |
| `concessions_used` | integer | yes |  |
| `next_action_at` | string (date-time) or null | yes |  |
| `owner_user_id` | string (uuid) or null | yes |  |
| `taken_over_by` | string (uuid) or null | no |  |
| `opted_out_at` | string (date-time) or null | no |  |
| `version` | integer | yes |  |
| `updated_at` | string (date-time) | yes |  |

### `DecisionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `decision` | `approve` \| `reject` \| `correct` | yes |  |
| `note` | string or null | no |  |

### `DeclineIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | yes | min length 1; max length 1000 |

### `ErpImportOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `rows` | integer | yes |  |
| `created` | integer | yes |  |
| `updated` | integer | yes |  |
| `sellable` | integer | yes |  |
| `not_sellable` | integer | yes |  |
| `linked_to_website` | integer | yes |  |
| `ambiguous_links` | integer | yes |  |
| `errors` | list of string | yes |  |
| `saved` | boolean | yes |  |

### `FieldChangeOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `field` | string | yes |  |
| `before` | any | yes |  |
| `after` | any | yes |  |

### `FlagIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `enabled` | boolean | yes |  |

### `FreshnessOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `material_code` | string | yes |  |
| `days_since_approval` | integer or null | yes |  |
| `level` | `ok` \| `warn` \| `block` | yes |  |

### `FxIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `currency` | string | yes | pattern `^[A-Z]{3}$` |
| `rate_to_aed` | number or string | yes |  |
| `as_of` | string (date) | yes |  |

### `FxRow`

| Field | Type | Required | Notes |
|---|---|---|---|
| `currency` | string | yes |  |
| `rate_to_aed` | string | yes |  |
| `as_of` | string (date) | yes |  |
| `source` | string | yes |  |

### `ImportOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `saved` | integer | yes |  |
| `errors` | list of `RowErrorOut` | yes |  |

### `InboxItemOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `kind` | string | yes |  |
| `ref_id` | string | yes |  |
| `deal_id` | string (uuid) | yes |  |
| `deal_number` | string | yes |  |
| `title` | string | yes |  |
| `due_at` | string (date-time) or null | yes |  |
| `created_at` | string (date-time) | yes |  |
| `overdue` | boolean | yes |  |

### `IssueOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `sheet` | string | yes |  |
| `row` | integer | yes |  |
| `column` | string | yes |  |
| `message` | string | yes |  |

### `KillSwitchIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `level` | `off` \| `marketing` \| `calls` \| `text_only` \| `hold` | yes |  |

### `KillSwitchOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `level` | `off` \| `marketing` \| `calls` \| `text_only` \| `hold` | yes |  |
| `marketing_stopped` | boolean | yes |  |
| `calls_stopped` | boolean | yes |  |
| `voice_stopped` | boolean | yes |  |
| `all_held` | boolean | yes |  |

### `LanguageOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `language` | string | yes |  |
| `status` | string | yes |  |
| `text` | string or null | yes |  |

### `LineCostOut`

MD only.

| Field | Type | Required | Notes |
|---|---|---|---|
| `line_no` | integer | yes |  |
| `material_rate` | string | yes |  |
| `kg_per_1000` | string | yes |  |
| `yield_pct` | string | yes |  |
| `production_per_1000` | string | yes |  |
| `packaging_per_1000` | string | yes |  |
| `freight_per_1000` | string | yes |  |
| `unit_cost` | string | yes |  |
| `markup_pct` | string | yes |  |
| `markup_min_pct` | string | yes |  |
| `markup_max_pct` | string | yes |  |

### `LineEditIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `line_no` | integer | yes | ≥ 1.0 |
| `unit_price` | number or string or null | no |  |
| `quantity` | number or string or null | no |  |

### `LoginIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |
| `password` | string | yes | min length 1; max length 256 |

### `ManagerBoard`

| Field | Type | Required | Notes |
|---|---|---|---|
| `period_from` | string (date) | yes |  |
| `period_to` | string (date) | yes |  |
| `salespeople` | list of `SalespersonBoard` | yes |  |
| `below_minimum_requests` | integer | yes |  |
| `change_requests_by_type` | map of integer | yes |  |
| `sla_breaches` | integer | yes |  |
| `price_list_changes` | integer | yes |  |
| `opted_out` | integer | yes |  |
| `opt_out_reasons` | map of integer | yes |  |

### `ManagerOfferIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `unit_price` | number or string | yes |  |
| `resume_ai` | boolean | no | default `true` |

### `ManualLineIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `description` | string | yes | min length 1; max length 500 |
| `quantity` | number or string | yes |  |
| `unit_price` | number or string | yes |  |
| `unit` | string | no | default `"pcs"` |
| `product_id` | string (uuid) or null | no |  |

### `ManualQuoteIn`

D8: the salesperson prices a custom, printed or unpriced item by hand.

| Field | Type | Required | Notes |
|---|---|---|---|
| `lines` | list of `ManualLineIn` | yes | min items 1 |
| `delivery_time_text` | string or null | no |  |
| `buyer_note` | string or null | no |  |

### `MdBoard`

| Field | Type | Required | Notes |
|---|---|---|---|
| `period_from` | string (date) | yes |  |
| `period_to` | string (date) | yes |  |
| `pipeline_aed_by_stage` | map of string | yes |  |
| `win_rate` | number or null | yes |  |
| `avg_discount_from_list` | number or null | yes |  |
| `deals_by_country` | map of integer | yes |  |
| `deals_by_category` | map of integer | yes |  |
| `deals_by_channel` | map of integer | yes |  |
| `top_buyers` | list of object | yes |  |
| `takeover_queue` | list of string (uuid) | yes |  |

### `OptOutIn`

§8.1 step 4: a salesperson records a stop the buyer asked for in a conversation the buyer started (e.g. on a call). Add only: nobody removes a stop here (step 6).

| Field | Type | Required | Notes |
|---|---|---|---|
| `scope` | `all` \| `whatsapp` \| `email` \| `phone` | no | default `"all"` |
| `words` | string | yes | what the buyer said, as close as possible min length 1; max length 2000 |
| `reason` | string or null | no | only a reason the buyer gave |

### `OrderOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `number` | string | yes |  |
| `deal_id` | string (uuid) | yes |  |
| `status` | string | yes |  |
| `final_quote_version_id` | string (uuid) | yes |  |
| `expected_reorder_date` | string (date) or null | no |  |

### `OrderRow`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `number` | string | yes |  |
| `deal_id` | string (uuid) | yes |  |
| `status` | string | yes |  |
| `production_started_on` | string (date) or null | yes |  |
| `ready_on` | string (date) or null | yes |  |
| `shipped_on` | string (date) or null | yes |  |
| `delivered_on` | string (date) or null | yes |  |
| `tracking_ref` | string or null | yes |  |
| `created_at` | string (date-time) | yes |  |

### `OrderStatusIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `status` | `ready` \| `shipped` \| `delivered` \| `cancelled` | yes |  |
| `on_date` | string (date) or null | no |  |
| `tracking_ref` | string or null | no |  |

### `Page_ApprovalOut_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `ApprovalOut` | yes |  |
| `next_cursor` | string or null | no |  |

### `Page_CompanyRow_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `CompanyRow` | yes |  |
| `next_cursor` | string or null | no |  |

### `Page_ContactRow_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `ContactRow` | yes |  |
| `next_cursor` | string or null | no |  |

### `Page_DealSummary_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `DealSummary` | yes |  |
| `next_cursor` | string or null | no |  |

### `Page_OrderRow_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `OrderRow` | yes |  |
| `next_cursor` | string or null | no |  |

### `Page_RateOut_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `RateOut` | yes |  |
| `next_cursor` | string or null | no |  |

### `Page_TimelineOut_`

| Field | Type | Required | Notes |
|---|---|---|---|
| `items` | list of `TimelineOut` | yes |  |
| `next_cursor` | string or null | no |  |

### `PasswordChangeIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `current_password` | string | yes | min length 1; max length 256 |
| `new_password` | string | yes | min length 12; max length 256 |

### `PaymentIn`

§15.1 / D20: the salesperson confirms the advance was received. Every detail is optional; an amount needs its currency.

| Field | Type | Required | Notes |
|---|---|---|---|
| `amount` | number or string or null | no |  |
| `currency` | string or null | no |  |
| `method` | string or null | no |  |
| `reference` | string or null | no |  |
| `paid_on` | string (date) or null | no |  |
| `note` | string or null | no |  |
| `proof_s3_key` | string or null | no |  |

### `PaymentOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `deal_id` | string (uuid) | yes |  |
| `amount` | string or null | yes |  |
| `currency` | string or null | yes |  |
| `method` | string or null | yes |  |
| `reference` | string or null | yes |  |
| `paid_on` | string (date) or null | yes |  |

### `PreviewOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes |  |
| `ok` | boolean | yes |  |
| `summary` | `SummaryOut` | yes |  |
| `errors` | list of `IssueOut` | yes |  |
| `warnings` | list of `IssueOut` | yes |  |
| `products` | list of `ProductChangeOut` | yes |  |
| `price_lists` | list of `TierChangeOut` | yes |  |
| `categories` | list of `CategoryChangeOut` | yes |  |

### `PriceTierIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `min_qty` | number or string | yes |  |
| `max_qty` | number or string or null | no |  |
| `list_price` | number or string | yes |  |
| `min_price` | number or string or null | no |  |
| `valid_from` | string (date-time) or null | no |  |

### `PriceTierOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `product_id` | string (uuid) | yes |  |
| `min_qty` | string | yes |  |
| `max_qty` | string or null | yes |  |
| `list_price` | string | yes |  |
| `min_price` | string or null | yes |  |
| `currency` | string | yes |  |
| `valid_from` | string (date-time) | yes |  |

### `PriceTierPatch`

| Field | Type | Required | Notes |
|---|---|---|---|
| `min_qty` | number or string or null | no |  |
| `max_qty` | number or string or null | no |  |
| `list_price` | number or string or null | no |  |
| `min_price` | number or string or null | no |  |

### `ProductChangeOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |
| `row` | integer | yes |  |
| `is_new` | boolean | yes |  |
| `changes` | list of `FieldChangeOut` | yes |  |
| `website_draft` | boolean | yes |  |

### `ProductEditIn`

CRM-owned fields only (D22): the CMS owns the description.

| Field | Type | Required | Notes |
|---|---|---|---|
| `moq` | integer or null | no |  |
| `carton_qty` | integer or null | no |  |
| `unit` | string or null | no |  |
| `is_active` | boolean or null | no |  |
| `is_quotable` | boolean or null | no |  |
| `default_lead_days_min` | integer or null | no |  |
| `default_lead_days_max` | integer or null | no |  |

### `ProductRow`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `sku` | string | yes |  |
| `name` | string | yes |  |
| `category_code` | string | yes |  |
| `unit` | string | yes |  |
| `moq` | integer or null | yes |  |
| `carton_qty` | integer or null | yes |  |
| `is_active` | boolean | yes |  |
| `is_quotable` | boolean | yes |  |
| `custom_printing` | boolean | yes |  |
| `default_lead_days_min` | integer or null | yes |  |
| `default_lead_days_max` | integer or null | yes |  |
| `spec` | object | yes |  |
| `cms_product_id` | string or null | yes |  |
| `cms_published` | boolean | yes |  |
| `cms_synced_at` | string (date-time) or null | yes |  |

### `QueuedOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `queued` | integer | yes |  |

### `QuoteEditsIn`

§11.3 "Edit then approve" / §13.3 "Revise quote": only the fields that change.

| Field | Type | Required | Notes |
|---|---|---|---|
| `lines` | list of `LineEditIn` | no | default `[]` |
| `delivery_time_text` | string or null | no |  |
| `delivery_place` | string or null | no |  |
| `incoterm` | `EXW` \| `FCA` \| `FOB` \| `CFR` \| `CIF` \| `CPT` \| `CIP` \| `DAP` \| `DDP` or null | no |  |
| `payment_terms_text` | string or null | no |  |
| `note` | string or null | no |  |
| `buyer_note` | string or null | no |  |
| `cover_note` | string or null | no |  |
| `currency` | string or null | no |  |

### `QuoteLineOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `line_no` | integer | yes |  |
| `description` | string | yes |  |
| `quantity` | string | yes |  |
| `unit` | string | yes |  |
| `unit_price` | string | yes |  |
| `line_total` | string | yes |  |

### `QuoteVersionOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `quote_id` | string (uuid) | yes |  |
| `version_no` | integer | yes |  |
| `kind` | string | yes |  |
| `status` | string | yes |  |
| `currency` | string | yes |  |
| `subtotal` | string | yes |  |
| `vat_rate` | string | yes |  |
| `vat_amount` | string | yes |  |
| `total` | string | yes |  |
| `total_aed` | string | yes |  |
| `incoterm` | string | yes |  |
| `validity_days` | integer | yes |  |
| `valid_until` | string (date) or null | yes |  |
| `clauses` | list of string | yes |  |
| `approver_summary` | string or null | yes |  |
| `delivery_time_text` | string or null | no |  |
| `delivery_place` | string or null | no |  |
| `payment_terms_text` | string or null | no |  |
| `fx_rate` | string or null | no |  |
| `fx_rate_date` | string (date) or null | no |  |
| `cover_note` | string or null | no |  |
| `change_summary` | string or null | no |  |
| `pdf_s3_key` | string or null | yes |  |
| `created_at` | string (date-time) | yes |  |
| `lines` | list of `QuoteLineOut` | no | default `[]` |

### `RateDecisionIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `rate_per_unit` | number or string or null | no |  |
| `note` | string or null | no |  |

### `RateOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `material_code` | string | yes |  |
| `rate_per_unit` | string | yes |  |
| `currency` | string | yes |  |
| `source` | string | yes |  |
| `source_url` | string or null | yes |  |
| `change_pct` | string or null | yes |  |
| `status` | string | yes |  |
| `proposed_at` | string (date-time) | yes |  |
| `decided_at` | string (date-time) or null | yes |  |
| `note` | string or null | yes |  |

### `ReassignIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string (uuid) | yes |  |

### `ReopenIn`

§7A.1 / D24: the manager reopens a LOST deal (back to the stage it was lost from).

| Field | Type | Required | Notes |
|---|---|---|---|
| `reason` | string | yes | min length 1; max length 500 |

### `RequirementOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `product_id` | string (uuid) or null | yes |  |
| `product_text` | string or null | yes |  |
| `spec` | object | yes |  |
| `quantity` | string or null | yes |  |
| `unit` | string | yes |  |
| `delivery_country` | string or null | yes |  |
| `delivery_city` | string or null | yes |  |
| `needed_by` | string (date) or null | yes |  |

### `ResetFinishIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |
| `code` | string | yes | min length 6; max length 10 |
| `new_password` | string | yes | min length 12; max length 256 |

### `ResetStartIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |

### `ResolveIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `version_id` | string (uuid) | yes |  |

### `RowErrorOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `row` | integer | yes |  |
| `field` | string | yes |  |
| `error` | string | yes |  |

### `SalespersonBoard`

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string (uuid) | yes |  |
| `name` | string | yes |  |
| `open_deals_by_stage` | map of integer | yes |  |
| `waiting_for_me` | integer | yes |  |
| `avg_response_minutes` | number or null | yes |  |
| `quotes_sent` | integer | yes |  |
| `deals_won` | integer | yes |  |

### `SettingIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `value` | any | yes |  |

### `SettingOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes |  |
| `value` | any | yes |  |
| `description` | string | yes |  |
| `updated_at` | string (date-time) | yes |  |

### `StaffMessageIn`

§14: the salesperson writes to the buyer from the CRM inbox (same channel, same company number).

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | no | max length 4000; default `""` |
| `client_key` | string | yes | min length 8; max length 80 |
| `channel` | `whatsapp` \| `email` or null | no |  |
| `reopen_template` | boolean | no | default `false` |

### `StaffMessageOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `message_id` | string (uuid) | yes |  |

### `StaffUserOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `email` | string | yes |  |
| `full_name` | string | yes |  |
| `role` | string | yes |  |
| `phone_e164` | string or null | yes |  |
| `is_active` | boolean | yes |  |
| `is_away` | boolean | yes |  |
| `languages` | list of string | yes |  |
| `countries` | list of string | yes |  |
| `category_codes` | list of string | yes |  |
| `alert_channels` | list of string | yes |  |

### `StageMoveIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `to` | `DealStage` | yes |  |
| `expected_version` | integer | yes |  |
| `reason` | string or null | no |  |
| `lost_reason` | `price_too_high` \| `delivery_not_suitable` \| `bought_competitor` \| `product_unavailable` \| `no_response_postponed` \| `budget` \| `duplicate` \| `other` \| `opted_out` or null | no |  |
| `lost_note` | string or null | no |  |

### `StockIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `product_id` | string (uuid) or null | no |  |
| `material_code` | string or null | no |  |
| `quantity` | number or string | yes |  |
| `unit` | string | no | default `"pcs"` |

### `StockOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `item_type` | string | yes |  |
| `product_id` | string (uuid) or null | yes |  |
| `material_code` | string or null | yes |  |
| `quantity` | string | yes |  |
| `reserved_quantity` | string | yes |  |
| `unit` | string | yes |  |

### `SummaryOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `new_products` | integer | yes |  |
| `updated_products` | integer | yes |  |
| `unchanged_products` | integer | yes |  |
| `price_lists_changed` | integer | yes |  |
| `categories_changed` | integer | yes |  |
| `website_drafts` | integer | yes |  |

### `TemplateIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `channel` | `whatsapp` \| `email` | yes |  |
| `name` | string | yes | pattern `^[a-z0-9_]{1,64}$` |
| `language` | string | yes | min length 2; max length 16 |
| `category` | `utility` \| `marketing` \| `authentication` \| `internal` | no | default `"utility"` |
| `subject` | string or null | no |  |
| `body` | string | yes | min length 1; max length 4000 |
| `variables` | list of string | no | max items 20 |

### `TemplateOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `channel` | string | yes |  |
| `name` | string | yes |  |
| `language` | string | yes |  |
| `category` | string | yes |  |
| `provider_status` | string | yes |  |
| `subject` | string or null | yes |  |
| `body` | string | yes |  |
| `variables` | list of string | yes |  |
| `version` | integer | yes |  |
| `provider_name` | string or null | yes |  |
| `live` | boolean | no | default `false` |
| `created_by` | string or null | yes |  |
| `created_at` | string (date-time) | yes |  |
| `updated_at` | string (date-time) | yes |  |

### `TemplateStatusIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `provider_status` | `draft` \| `submitted` \| `approved` \| `rejected` \| `paused` \| `superseded` | yes |  |

### `TextIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `text` | string | yes | min length 1; max length 2000 |

### `TextOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes |  |
| `group` | string | yes |  |
| `note` | string | yes |  |
| `placeholders` | list of string | yes |  |
| `builtin_en` | string | yes |  |
| `en` | string | yes |  |
| `en_version` | integer | yes |  |
| `updated_by` | string (uuid) or null | yes |  |
| `updated_at` | string (date-time) or null | yes |  |
| `languages` | list of `LanguageOut` | yes |  |

### `TierChangeOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes |  |
| `before` | list of list of string or null | yes |  |
| `after` | list of list of string or null | yes |  |

### `TimelineOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | yes |  |
| `kind` | string | yes |  |
| `channel` | string or null | yes |  |
| `direction` | string or null | yes |  |
| `summary` | string | yes |  |
| `actor_type` | string | yes |  |
| `actor_id` | string or null | yes |  |
| `at` | string (date-time) | yes |  |

### `TokenOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `access_token` | string | yes |  |
| `token_type` | `Bearer` | no | default `"Bearer"` |
| `expires_in` | integer | yes |  |
| `mfa` | boolean | yes |  |
| `amr` | list of string | yes |  |
| `must_change_password` | boolean | yes |  |
| `totp_enrolled` | boolean | yes |  |
| `user` | `StaffUserOut` | yes |  |

### `TotpConfirmIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes | min length 6; max length 10 |

### `TotpEnrolOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `secret` | string | yes |  |
| `otpauth_uri` | string | yes |  |

### `UserAdminOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `email` | string | yes |  |
| `full_name` | string | yes |  |
| `role` | string | yes |  |
| `phone_e164` | string or null | yes |  |
| `is_active` | boolean | yes |  |
| `is_away` | boolean | yes |  |
| `languages` | list of string | yes |  |
| `countries` | list of string | yes |  |
| `category_codes` | list of string | yes |  |
| `alert_channels` | list of string | yes |  |
| `backup_user_id` | string (uuid) or null | yes |  |
| `totp_enrolled` | boolean | yes |  |
| `locked` | boolean | yes |  |

### `UserCreateIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | yes | min length 3; max length 320 |
| `full_name` | string | yes | min length 1; max length 200 |
| `role` | `md` \| `manager` \| `admin` \| `sales` \| `content_editor` | yes |  |
| `phone_e164` | string or null | no |  |
| `break_glass` | boolean | no | default `false` |

### `UserCreatedOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `user` | `StaffUserOut` | yes |  |
| `temporary_password` | string | yes |  |

### `UserOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | yes |  |
| `full_name` | string | yes |  |
| `role` | string | yes |  |
| `is_active` | boolean | yes |  |
| `is_away` | boolean | yes |  |
| `backup_user_id` | string (uuid) or null | yes |  |
| `languages` | list of string | yes |  |
| `countries` | list of string | yes |  |
| `category_codes` | list of string | yes |  |
| `alert_channels` | list of string | yes |  |

### `UserPatchIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `full_name` | string or null | no |  |
| `role` | `md` \| `manager` \| `admin` \| `sales` \| `content_editor` or null | no |  |
| `phone_e164` | string or null | no |  |
| `is_active` | boolean or null | no |  |
| `languages` | list of string or null | no |  |
| `countries` | list of string or null | no |  |
| `category_codes` | list of string or null | no |  |
| `alert_channels` | list of `whatsapp` \| `email` \| `call` \| `in_app` or null | no |  |

### `VariantOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `sku` | string | yes |  |
| `description` | string | yes |  |
| `packing` | string or null | yes |  |
| `unit` | string | yes |  |
| `availability` | string | yes |  |
| `moq` | integer or null | yes |  |
| `quantity_breaks` | list of string | yes |  |
| `quotable` | boolean | yes |  |

### `WebsiteLinkIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `cms_product_id` | string or null | yes |  |

### `WonIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `expected_reorder_date` | string (date) or null | no |  |

### `kx__crm__api__company__CompanyIn`

Only the fields to change; "" clears a field (company.yaml's value is printed again).

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string or null | no |  |
| `address` | string or null | no |  |
| `trn` | string or null | no |  |
| `phone` | string or null | no |  |
| `email` | string or null | no |  |
| `bank` | `BankIn` or null | no |  |

### `kx__crm__api__records__CompanyIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | min length 1; max length 300 |
| `country_code` | string or null | no |  |
| `city` | string or null | no |  |
| `customer_type` | `distributor` \| `restaurant_chain` \| `caterer` \| `airline` \| `retailer` \| `manufacturer` \| `other` or null | no |  |
| `vat_trn` | string or null | no |  |
| `website` | string or null | no |  |
| `notes` | string or null | no |  |

### `kx__crm__api__screens__ChangeOut`

One logged change (§3 "every change is logged"): who, when, what, old and new value.

| Field | Type | Required | Notes |
|---|---|---|---|
| `at` | string (date-time) | yes |  |
| `actor_type` | string | yes |  |
| `actor_id` | string | yes |  |
| `action` | string | yes |  |
| `entity_type` | string | yes |  |
| `entity_id` | string | yes |  |
| `before` | object or null | yes |  |
| `after` | object or null | yes |  |

### `kx__crm__api__texts__ChangeOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `at` | string (date-time) | yes |  |
| `actor_type` | string | yes |  |
| `actor_id` | string | yes |  |
| `action` | string | yes |  |
| `before` | object or null | yes |  |
| `after` | object or null | yes |  |

