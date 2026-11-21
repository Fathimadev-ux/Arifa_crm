# CMS API: frontend hand-off

For the **website developer** (Arifa Pack site, Next.js, github.com/rizwankairoxaitech/Arifa-Pack) and the
developer of the **CMS admin screens** (in the CRM web app). The CMS is the platform package `kx.cms` (D54): the
client team edits the website's text, photos, videos, products, colours and SEO there, without a developer, and
the website shows the change within about a minute. This document is generated from the code (`make handoff`);
the endpoint reference at the end is always the server's real contract.

* Website reads: **`/v1/content/*`**, public, no login, cached.
* Editors: **`/v1/cms/*`**, staff login (the CRM's `/v1/auth`, see CRM_API.md §3), roles content editor, admin,
  manager, MD.
* Mock server for building before the backend runs:

```bash
npx @stoplight/prism-cli mock docs/handoff/openapi/openapi-cms.json --port 4012
```

---

## 1. How a change reaches the website (and the AI, and the CRM)

```
editor ──PUT draft──► /v1/cms ──publish──► kx.cms ──(same transaction)──► outbox: content.published.v1
                                                                         kb.content_published.v1 (per language)
                                                                         catalogue.product_published.v1 (products)
outbox ──relay (every few s)──► job "app.cms_revalidate" ──POST {website}/api/revalidate (HMAC)──► Next.js
                                                                                     revalidateTag / revalidatePath
website ──GET /v1/content/... (tags)──► fresh content          AI: site map + knowledge re-indexed; CRM: product details
```

1. The editor saves a **draft** (`PUT /v1/cms/collections/{collection}/{key}`), previews it on the website
   (§5), and **publishes** it (`POST .../publish`).
2. In the same transaction the CMS records the events above. Every published version is kept and can be
   restored.
3. Within seconds the platform calls the website: **`POST {KX_APP_WEBSITE_URL}/api/revalidate`** (§4). The site
   re-renders the affected pages. **The change is live in about a minute** (SRS §7).
4. Fallback: give every content fetch `next: { revalidate: 60, tags: [...] }`, so a missed call still heals
   within a minute.
5. The same publish rebuilds the AI's **site map** (`GET /v1/content/manifest`, D55), re-indexes the AI's
   **knowledge**, and updates the **CRM** product record. The website, the assistant and the sales team
   therefore always see the same content.

**Prices never appear in content** (SRS §7, D22): a field named like a price, or a text stating an amount of
money (`AED 1.20`, `3.5 dirhams`, `$2`), is refused on save with `422 rule_violation` (`reason: cms_price`).
Percentages ("80 % recycled aluminium") are fine. Prices live only in the CRM and reach a buyer only inside a
manager-approved quotation.

---

## 2. Languages

Every document is stored per language: `{"en": {...}, "ar": {...}}`. **English is complete**; Arabic holds
only what is translated. The API merges them for you: `?locale=ar` returns the Arabic values laid over the
English ones, field by field. Lists of objects (page blocks, FAQs) merge item by item, so block 3's Arabic
heading can be translated alone (design doc §6: "Text without an Arabic entry stays in English"). Codes, numbers
and media are shared. Pages stay English and Arabic; the assistant speaks six languages but always links to
`/…` or `/ar/…`.

---

## 3. The content model: what each page section reads

Collections (`GET /v1/cms/collections` returns each one's JSON Schema, so the admin screens can draw a form
for each type without a code change):

| Collection | Key | What it holds |
|---|---|---|
| `site` | `site` (one document) | Company name, phones, emails, addresses, hours, social links, announcement bar, **theme colours and fonts**, the assistant's fixed texts (greeting, recording notice, hand-over, busy, offline), `product_pages` (PG-03 live?) |
| `pages` | `home`, `products`, `about`, `quality`, `clients`, `contact`, `privacy`, … | Title, path, SEO / AEO / GEO, FAQs, and an ordered list of **blocks**: one per section, keyed by `section_id` |
| `families` | `containers`, `foil`, `platters`, `cups-trays`, `pots`, `microwave`, `cutlery`, `cling-film` | Name, short name, blurb, clip, hero media, accent colour, **synonyms per language** (what visitors call it; the AI uses them), SEO |
| `products` | the site's id (`ac-8325`, `sr-con-8342`, `foil-45-blue` …) | `family`, `ref` (8325), `code` (AC-1), `name`, `qty` (packing), `range` (trade / self), descriptions, specs, oven / microwave / freezer, applications, photos, video, datasheet, 3D model, FAQs, `legacy_paths` (old-site addresses), SEO |
| `tour_chapters` | `arrival`, `forming`, `lids`, `foil`, `packing`, `moulding`, `warehouse` | HM-05 chapter title, the film time in `seconds`, linked family |
| `stations` | `material-in` … `dispatch` | QA-02 the seven checked stations |
| `faqs`, `certificates` | free keys | Questions and answers; certificate title, issuer, file, validity |
| `clients`, `industries`, `stories` | free keys | CL-02 logos, CL-01 the six delivery stops (trade, use, product kit), CL-03 stories. All have `sample: true` until Arifa approves |
| `leadership` | free keys | AB-05 / AB-06 the CEO and the directors (role, quote, message, photo) |

**`section_id` is a contract with the website and the AI (D55):** it is the DOM `id` the page renders and the id
the assistant scrolls to (`scroll_to {section}`). Never rename one without changing the site.

### Page sections → CMS fields (design doc v4 IDs)

| Design ID | Page / section | `section_id` (DOM id) | Where the content lives |
|---|---|---|---|
| SH-02 / SH-03 / SH-04 | Header, menu, footer | (shared) | `site`: phones, emails, addresses, hours; `families` for the footer list |
| SH-05 | Assistant texts | (panel) | `site.assistant` |
| HM-01 | Home hero | `top` | `pages/home` block `top` (heading = the line), `families` (the eight, in order) |
| HM-02 | The company | `intro` *(add this id on the site)* | `pages/home` block `intro` (body, media = the clips set into the text) |
| HM-03 | The line | `factory` | block `factory` (heading, three captions as `items`) |
| HM-04 | Products list | `range` | block `range` + `families` (name, clip, hero) |
| HM-05 | Walk the floor | `floor` | block `floor` + `tour_chapters` (title, seconds) |
| HM-06 | What we do | `company` | block `company` (four services as `items`) + `leadership` (directors) |
| HM-07 | Request a quote | `contact` | block `contact` + `site` contacts |
| PR-01 | Products header | `top` | `pages/products` block `top` (counts come from `GET /v1/content/products`) |
| PR-02 | Browse by family | `families` *(add this id)* | `families` |
| PR-03 / PR-04 / PR-05 | Catalogue, quick view, tray | `catalogue` | `products` (cards and quick view) |
| PR-06 / PD-06 | Not listed? | `not-listed` *(add this id)* | block `not-listed` + `site.phones` |
| PD-01 … PD-05 | Product page (PG-03) | (page) | `GET /v1/content/products/{id}`: the product, its family, previous / next, four more from the family |
| AB-01 … AB-08 | About | `top`, `story`, `values`, `reach`, `chairman`, `leadership`, `what-we-do`, `visit` | `pages/about` blocks; `leadership`; `site` addresses and hours |
| QA-01 … QA-06 | Quality | `top`, `line`, `hygiene`, `documents`, `sustainability`, `see-it` *(add)* | `pages/quality` blocks; `stations`; `certificates`; `products` (QA-05: one dot per product) |
| CL-01 … CL-04 | Clients | `industries`, `clients`, `reviews`, `your-business` *(add)* | `industries`, `clients`, `stories`, `pages/clients` blocks |
| CT-01 … CT-03 | Contact | `enquiry`, `call`, `where` | `pages/contact` blocks; `site` phones, emails, address, map |

A block is `{section_id, design_id, kind, eyebrow, heading, body, media[], items[], buttons[], keywords[],
data{}, hidden}`. `items` are `{title, text, media, link, data}` (services, captions, values, steps). `data`
holds anything else a section needs. `keywords` are the words that lead the AI to this section.

### Products and their variants (D61)

A website product (`ac-8325`) is the **marketing record**. What Arifa actually sells, prices and stocks are its
**variants** in the CRM: the ERP items (8325 container 1*1000, 1*400; 45 cm foil in about 20 roll weights; retail
packs). Each variant is linked to its website product by the product's id. The website shows the product; the
assistant explains the variants (packing, availability as "in stock" / "limited" / "made to order", quantity
breaks) and the quotation carries the exact variant. **No variant data and no price is in this API.**

### Media

Every media field is a `MediaRef`: `{"asset_id": "<uuid>"}` from the media library, or `{"url": "https://…"}`
for an outside link (e.g. a YouTube film). The public API completes each one with `src` (absolute URL),
`alt` (in the requested language), `width`, `height` and `content_type`. Files live in Cloudflare R2 under
**content-addressed** URLs: a new file is a new URL, so cache them for ever (`Cache-Control: immutable`) and use
a `next/image` loader for resizing.

Upload (admin screens): `POST /v1/cms/media/uploads` with name, type, size and SHA-256. Then `PUT` the file to
the returned `upload_url` with the returned `headers`, straight from the browser to R2. Then
`POST /v1/cms/media/{id}/confirm`. Images are up to 15 MB, videos 300 MB, PDFs 30 MB and GLB 3D models 50 MB.

---

## 4. The revalidate call the website must accept

```
POST {website}/api/revalidate
Content-Type: application/json
X-Kx-Timestamp: <unix seconds>
X-Kx-Signature: sha256=<hex HMAC-SHA256(KX_APP_WEBSITE_REVALIDATE_SECRET, "<timestamp>." + raw body)>

{"event_id": "0195…", "collection": "products", "key": "ac-8325", "operation": "publish",
 "tags": ["products:ac-8325", "products", "manifest", "family:containers", "sitemap"],
 "paths": ["/products", "/ar/products", "/quality", "/ar/quality"]}
```

* Refuse a bad signature or a timestamp more than 5 minutes off (401).
* Call `revalidateTag(t)` for each tag and `revalidatePath(p)` for each path, then answer 200.
* A repeat of the same `event_id` is harmless.
* `operation: "unpublish"`: the document is gone; the same tags and paths are refreshed (the page then gets
  404 or drops the item).

Tag your fetches with the same names: `site`, `pages:<slug>`, `families`, `products`, `products:<id>`,
`family:<id>`, `manifest`, `sitemap`, `<collection>`. A Next.js route handler sketch is in FRONTEND_GUIDE.md.

---

## 5. Preview (draft mode)

`POST /v1/cms/preview-token` returns `{token, expires_at, url}`. The token is valid 30 minutes. The admin
screen opens `url` (`{website}/api/draft?token=…`); the site enables Next.js draft mode and adds
`?preview=<token>` to its content reads. The API then answers the drafts, never cached (`Cache-Control:
private, no-store`, `draft: true` on each document). An invalid or expired token is ignored: the published
content comes back.

---

## 6. Caching

Every `/v1/content` answer has `ETag` and `Cache-Control: public, max-age=30, s-maxage=60,
stale-while-revalidate=600`. Send `If-None-Match` to get `304`. The CMS revision (`revision` in list answers)
grows on every publish anywhere.

---

## 7. Errors

`application/problem+json` as in CRM_API.md §6.

| Status | When |
|---|---|
| 404 | The document is unknown or not published |
| 409 | A colleague saved the draft meanwhile: reload, then save again with the new `revision` |
| 422 `rule_violation` | `reason` is `cms_price` (a price in content), `cms_invalid` (a field breaks its schema; the message names it, e.g. `ar.blocks.2.heading`), `cms_family` (publish the family first), `cms_no_draft`, `cms_media_type` / `cms_media_size` |
| 401 / 403 | Admin routes without a staff token, or with a role that may not edit content |
| 503 | Media storage is not configured |

## CMS endpoint reference

### cms

#### `GET /v1/cms/collections`

Every content type with its JSON Schema (fields, types, limits), to draw the editor forms.

**Who:** content_editor, admin, manager, md

**Response 200:** list of `CollectionInfo`

<details><summary>Example response 200</summary>

```json
[
  {
    "name": "Aisha Khan",
    "title": "Aluminium Container & Lid",
    "single": false,
    "json_schema": {}
  }
]
```

</details>


---

#### `GET /v1/cms/collections/{collection}`

The documents of one content type, in display order, with their state (draft / published / changed = live with unpublished edits).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |

**Response 200:** list of `DocumentSummary`

<details><summary>Example response 200</summary>

```json
[
  {
    "key": "<key>",
    "title": "Aluminium Container & Lid",
    "sort_order": 1,
    "updated_at": "2026-12-15T09:00:00+04:00",
    "status": "draft",
    "published_version": 1,
    "draft_revision": 1
  }
]
```

</details>


---

#### `GET /v1/cms/collections/{collection}/{key}`

One document: its open draft (with `revision`, needed to save) and its live version.

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |

**Response 200:** `DocumentOut`

<details><summary>Example response 200</summary>

```json
{
  "collection": "<collection>",
  "key": "<key>",
  "sort_order": 1,
  "updated_at": "2026-12-15T09:00:00+04:00",
  "draft": {
    "number": 1,
    "status": "draft",
    "revision": 1,
    "data": {},
    "author": "<author>",
    "saved_at": "2026-12-15T09:00:00+04:00",
    "published_at": "2026-12-15T09:00:00+04:00",
    "published_by": "<published_by>",
    "note": "<note>"
  },
  "published": {
    "number": 1,
    "status": "draft",
    "revision": 1,
    "data": {},
    "author": "<author>",
    "saved_at": "2026-12-15T09:00:00+04:00",
    "published_at": "2026-12-15T09:00:00+04:00",
    "published_by": "<published_by>",
    "note": "<note>"
  }
}
```

</details>


---

#### `PUT /v1/cms/collections/{collection}/{key}`

Save the draft (creates the document when new). Send the `revision` you loaded; if a colleague saved meanwhile the answer is 409 and nothing is overwritten. Prices are refused (422 `cms_price`).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |

**Request body** (`application/json`): `SaveDraftIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | object | yes | Content per language: {"en": {...}, "ar": {...}} |
| `revision` | integer or null | no | The draft revision you started from (null for a new draft) |
| `sort_order` | integer or null | no |  |

<details><summary>Example request</summary>

```json
{
  "data": {},
  "revision": 1,
  "sort_order": 1
}
```

</details>

**Response 200:** `VersionOut`

<details><summary>Example response 200</summary>

```json
{
  "number": 1,
  "status": "draft",
  "revision": 1,
  "data": {},
  "author": "<author>",
  "saved_at": "2026-12-15T09:00:00+04:00",
  "published_at": "2026-12-15T09:00:00+04:00",
  "published_by": "<published_by>",
  "note": "<note>"
}
```

</details>


---

#### `POST /v1/cms/collections/{collection}/{key}/publish`

Put the draft live. The website re-renders the affected pages within about a minute; the AI's knowledge and the CRM product record follow automatically.

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |

**Request body** (`application/json`): `PublishIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `note` | string or null | no |  |

<details><summary>Example request</summary>

```json
{
  "note": "<note>"
}
```

</details>

**Response 200:** `VersionOut`

<details><summary>Example response 200</summary>

```json
{
  "number": 1,
  "status": "draft",
  "revision": 1,
  "data": {},
  "author": "<author>",
  "saved_at": "2026-12-15T09:00:00+04:00",
  "published_at": "2026-12-15T09:00:00+04:00",
  "published_by": "<published_by>",
  "note": "<note>"
}
```

</details>


---

#### `POST /v1/cms/collections/{collection}/{key}/unpublish`

Take the document off the website (versions are kept; publish again to bring it back).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |

**Response 204:** (no body)

---

#### `DELETE /v1/cms/collections/{collection}/{key}/draft`

Throw the open draft away (a document that was never published disappears with it).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |

**Response 204:** (no body)

---

#### `GET /v1/cms/collections/{collection}/{key}/versions`

Every version, newest first (each publish is kept).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |

**Response 200:** list of `VersionSummary`

<details><summary>Example response 200</summary>

```json
[
  {
    "number": 1,
    "status": "draft",
    "author": "<author>",
    "saved_at": "2026-12-15T09:00:00+04:00",
    "published_at": "2026-12-15T09:00:00+04:00",
    "published_by": "<published_by>",
    "note": "<note>"
  }
]
```

</details>


---

#### `POST /v1/cms/collections/{collection}/{key}/versions/{number}/restore`

Copy an earlier version into the draft; publish it to go live again.

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `key` | path | string | yes |  |
| `number` | path | integer | yes |  |

**Response 200:** `VersionOut`

<details><summary>Example response 200</summary>

```json
{
  "number": 1,
  "status": "draft",
  "revision": 1,
  "data": {},
  "author": "<author>",
  "saved_at": "2026-12-15T09:00:00+04:00",
  "published_at": "2026-12-15T09:00:00+04:00",
  "published_by": "<published_by>",
  "note": "<note>"
}
```

</details>


---

#### `POST /v1/cms/preview-token`

A 30-minute token that makes the website show drafts (Next.js draft mode).

**Who:** content_editor, admin, manager, md

**Response 200:** `PreviewOut`

<details><summary>Example response 200</summary>

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIuLi4ifQ.signature",
  "expires_at": "2026-12-15T09:00:00+04:00",
  "url": "https://www.arifapack.com/products"
}
```

</details>


---

#### `GET /v1/cms/media`

The library, newest first (`kind` = image, video, application (PDF) or model (3D)).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `kind` | query | string or null | no |  |

**Response 200:** list of `MediaOut`

<details><summary>Example response 200</summary>

```json
[
  {
    "id": "<id>",
    "src": "<src>",
    "filename": "<filename>",
    "content_type": "<content_type>",
    "size_bytes": 1,
    "width": 1,
    "height": 1,
    "alt": {},
    "created_at": "2026-12-15T09:00:00+04:00"
  }
]
```

</details>


---

#### `POST /v1/cms/media/uploads`

Step 1: ask where to upload. PUT the file to `upload_url` with `headers`, then confirm. Accepted: WebP, JPEG, PNG, AVIF, SVG (15 MB), MP4, WebM (300 MB), PDF (30 MB), GLB 3D models (50 MB).

**Who:** content_editor, admin, manager, md

**Request body** (`application/json`): `UploadIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `filename` | string | yes | min length 1; max length 300 |
| `content_type` | string | yes | max length 100 |
| `size` | integer | yes | > 0.0 |
| `sha256` | string | yes | pattern `^[0-9a-f]{64}$` |
| `alt` | map of string | no |  |

<details><summary>Example request</summary>

```json
{
  "filename": "<filename>",
  "content_type": "<content_type>",
  "size": 1,
  "sha256": "<sha256>",
  "alt": {}
}
```

</details>

**Response 201:** `UploadOut`

<details><summary>Example response 201</summary>

```json
{
  "asset_id": "0195f0c2-7a3e-7c41-9b1d-2f4e6a8c0d12",
  "object_key": "<object_key>",
  "upload_url": "<upload_url>",
  "headers": {},
  "already_uploaded": false
}
```

</details>


---

#### `POST /v1/cms/media/{asset_id}/confirm`

Step 2: the browser's PUT succeeded; the file joins the library.

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `asset_id` | path | string | yes |  |

**Request body** (`application/json`): `ConfirmIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `width` | integer or null | no |  |
| `height` | integer or null | no |  |

<details><summary>Example request</summary>

```json
{
  "width": 1,
  "height": 1
}
```

</details>

**Response 200:** `MediaOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "<id>",
  "src": "<src>",
  "filename": "<filename>",
  "content_type": "<content_type>",
  "size_bytes": 1,
  "width": 1,
  "height": 1,
  "alt": {},
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

#### `PATCH /v1/cms/media/{asset_id}`

Alt text per language (accessibility and SEO).

**Who:** content_editor, admin, manager, md

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `asset_id` | path | string | yes |  |

**Request body** (`application/json`): `AltIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `alt` | map of string | yes |  |

<details><summary>Example request</summary>

```json
{
  "alt": {}
}
```

</details>

**Response 200:** `MediaOut`

<details><summary>Example response 200</summary>

```json
{
  "id": "<id>",
  "src": "<src>",
  "filename": "<filename>",
  "content_type": "<content_type>",
  "size_bytes": 1,
  "width": 1,
  "height": 1,
  "alt": {},
  "created_at": "2026-12-15T09:00:00+04:00"
}
```

</details>


---

### content

#### `GET /v1/content/site`

Site settings: company name, phones, emails, addresses, hours, social links, announcement bar, theme colours and fonts, the assistant's fixed texts, and whether product pages (PG-03) are live.

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `locale` | query | `en` \| `ar` | no | default `"en"` |
| `preview` | query | string or null | no |  |

**Response 200:** `ContentDoc`

<details><summary>Example response 200</summary>

```json
{
  "collection": "<collection>",
  "key": "<key>",
  "version": 1,
  "published_at": "2026-12-15T09:00:00+04:00",
  "data": {},
  "draft": false
}
```

</details>


---

#### `GET /v1/content/manifest`

D55: the site map the AI assistant uses (pages and their section ids, families with their names and synonyms in six languages, products with their paths, factory-tour chapters). The website's instant navigation (layer 0) reads the same data.

**Who:** public

**Response 200:** `SiteManifest`

<details><summary>Example response 200</summary>

```json
{
  "revision": 1,
  "built_at": "2026-12-15T09:00:00+04:00",
  "pages": [],
  "families": [],
  "products": [],
  "chapters": [],
  "product_pages": false
}
```

</details>


---

#### `GET /v1/content/pages/{slug}`

One page with its section blocks (home, products, about, quality, clients, contact, privacy).

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `slug` | path | string | yes |  |
| `locale` | query | `en` \| `ar` | no | default `"en"` |
| `preview` | query | string or null | no |  |

**Response 200:** `ContentDoc`

<details><summary>Example response 200</summary>

```json
{
  "collection": "<collection>",
  "key": "<key>",
  "version": 1,
  "published_at": "2026-12-15T09:00:00+04:00",
  "data": {},
  "draft": false
}
```

</details>


---

#### `GET /v1/content/families`

The product families, in their display order (HM-01, HM-04, PR-02).

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `locale` | query | `en` \| `ar` | no | default `"en"` |
| `preview` | query | string or null | no |  |

**Response 200:** `ContentList`

<details><summary>Example response 200</summary>

```json
{
  "collection": "<collection>",
  "locale": "en",
  "revision": 1,
  "items": [
    {
      "collection": "<collection>",
      "key": "<key>",
      "version": 1,
      "published_at": "2026-12-15T09:00:00+04:00",
      "data": {},
      "draft": false
    }
  ]
}
```

</details>


---

#### `GET /v1/content/products`

The catalogue (PR-03), in catalogue order; filters as on the site: `family`, `q`, `range`.

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `locale` | query | `en` \| `ar` | no | default `"en"` |
| `family` | query | string or null | no |  |
| `q` | query | string or null | no |  |
| `range` | query | string or null | no |  |
| `preview` | query | string or null | no |  |

**Response 200:** `ContentList`

<details><summary>Example response 200</summary>

```json
{
  "collection": "<collection>",
  "locale": "en",
  "revision": 1,
  "items": [
    {
      "collection": "<collection>",
      "key": "<key>",
      "version": 1,
      "published_at": "2026-12-15T09:00:00+04:00",
      "data": {},
      "draft": false
    }
  ]
}
```

</details>


---

#### `GET /v1/content/products/{product_id}`

PG-03: one product with its family, previous / next in the catalogue (PD-04) and up to four more from the same family (PD-05).

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `product_id` | path | string | yes |  |
| `locale` | query | `en` \| `ar` | no | default `"en"` |
| `preview` | query | string or null | no |  |

**Response 200:** `ProductDetail`

<details><summary>Example response 200</summary>

```json
{
  "product": {
    "collection": "<collection>",
    "key": "<key>",
    "version": 1,
    "published_at": "2026-12-15T09:00:00+04:00",
    "data": {},
    "draft": false
  },
  "family": {
    "collection": "<collection>",
    "key": "<key>",
    "version": 1,
    "published_at": "2026-12-15T09:00:00+04:00",
    "data": {},
    "draft": false
  },
  "previous": {
    "key": "<key>",
    "ref": "<ref>",
    "name": "Aisha Khan"
  },
  "next": {
    "key": "<key>",
    "ref": "<ref>",
    "name": "Aisha Khan"
  },
  "more_from_family": [
    {
      "collection": "<collection>",
      "key": "<key>",
      "version": 1,
      "published_at": "2026-12-15T09:00:00+04:00",
      "data": {},
      "draft": false
    }
  ]
}
```

</details>


---

#### `GET /v1/content/collections/{collection}`

Any other collection, in display order: `tour_chapters` (HM-05), `stations` (QA-02), `faqs`, `certificates` (QA-04), `clients` (CL-02), `industries` (CL-01), `stories` (CL-03), `leadership` (AB-05, AB-06).

**Who:** public

**Parameters**

| Name | In | Type | Required | Notes |
|---|---|---|---|---|
| `collection` | path | string | yes |  |
| `locale` | query | `en` \| `ar` | no | default `"en"` |
| `preview` | query | string or null | no |  |

**Response 200:** `ContentList`

<details><summary>Example response 200</summary>

```json
{
  "collection": "<collection>",
  "locale": "en",
  "revision": 1,
  "items": [
    {
      "collection": "<collection>",
      "key": "<key>",
      "version": 1,
      "published_at": "2026-12-15T09:00:00+04:00",
      "data": {},
      "draft": false
    }
  ]
}
```

</details>


---

#### `GET /v1/content/sitemap`

Every published page, family and product, in English and Arabic, for `/sitemap.xml` (§9).

**Who:** public

**Response 200:** list of `SitemapEntry`

<details><summary>Example response 200</summary>

```json
[
  {
    "path_en": "<path_en>",
    "path_ar": "<path_ar>",
    "updated_at": "2026-12-15T09:00:00+04:00",
    "kind": "page"
  }
]
```

</details>


---

#### `GET /v1/content/redirects`

Old-site addresses that move permanently to their new page (design doc §9): each product's `legacy_paths` (e.g. `/8325.php`) to its page (or its quick view until PG-03 is live).

**Who:** public

**Response 200:** list of `Redirect`

<details><summary>Example response 200</summary>

```json
[
  {
    "source": "<source>",
    "destination": "<destination>",
    "permanent": true
  }
]
```

</details>


---

## CMS endpoint reference: data shapes

### `AltIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `alt` | map of string | yes |  |

### `CollectionInfo`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes |  |
| `title` | string | yes |  |
| `single` | boolean | yes |  |
| `json_schema` | object | yes |  |

### `ConfirmIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `width` | integer or null | no |  |
| `height` | integer or null | no |  |

### `ContentDoc`

One published document in one language. `data` follows the collection's schema (CMS_API.md), with every media reference completed by `src`, `alt`, `width`, `height` and `content_type`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `collection` | string | yes |  |
| `key` | string | yes |  |
| `version` | integer | yes |  |
| `published_at` | string (date-time) or null | yes |  |
| `data` | object | yes |  |
| `draft` | boolean | no | default `false` |

### `ContentList`

| Field | Type | Required | Notes |
|---|---|---|---|
| `collection` | string | yes |  |
| `locale` | `en` \| `ar` | yes |  |
| `revision` | integer | yes |  |
| `items` | list of `ContentDoc` | yes |  |

### `DocumentOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `collection` | string | yes |  |
| `key` | string | yes |  |
| `sort_order` | integer | yes |  |
| `updated_at` | string (date-time) | yes |  |
| `draft` | `VersionOut` or null | yes |  |
| `published` | `VersionOut` or null | yes |  |

### `DocumentSummary`

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes |  |
| `title` | string | yes |  |
| `sort_order` | integer | yes |  |
| `updated_at` | string (date-time) | yes |  |
| `status` | `draft` \| `published` \| `changed` | yes |  |
| `published_version` | integer or null | yes |  |
| `draft_revision` | integer or null | yes |  |

### `ManifestChapter`

A factory-tour chapter (HM-05): the film opens at `seconds`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes |  |
| `title` | string | yes |  |
| `seconds` | number | no | default `0` |
| `family` | string or null | no |  |

### `ManifestFamily`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes |  |
| `name` | string | yes |  |
| `names` | map of string | no | default `{}` |
| `synonyms` | map of list of string | no | default `{}` |
| `path_en` | string | no | default `""` |
| `path_ar` | string | no | default `""` |

### `ManifestPage`

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes |  |
| `title` | string | yes |  |
| `names` | map of string | no | default `{}` |
| `path_en` | string | yes |  |
| `path_ar` | string | yes |  |
| `sections` | list of `ManifestSection` | no | default `[]` |

### `ManifestProduct`

What the AI may say about a product and where it lives on the site. Never a price (§7).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes |  |
| `ref` | string | yes |  |
| `catalogue_code` | string or null | no |  |
| `family` | string | yes |  |
| `name` | string | yes |  |
| `packing` | string or null | no |  |
| `range` | `trade` \| `self` | no | default `"trade"` |
| `path_en` | string | no | default `""` |
| `path_ar` | string | no | default `""` |
| `has_photo` | boolean | no | default `true` |

### `ManifestSection`

One section of a page. `id` is the DOM id the website scrolls to (a contract with the site, D55).

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes |  |
| `design_id` | string or null | no |  |
| `title` | string | no | default `""` |
| `purpose` | string | no | default `""` |
| `keywords` | list of string | no | default `[]` |

### `MediaOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes |  |
| `src` | string | yes |  |
| `filename` | string | yes |  |
| `content_type` | string | yes |  |
| `size_bytes` | integer | yes |  |
| `width` | integer or null | yes |  |
| `height` | integer or null | yes |  |
| `alt` | map of string | yes |  |
| `created_at` | string (date-time) | yes |  |

### `PreviewOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | yes |  |
| `expires_at` | string (date-time) | yes |  |
| `url` | string or null | yes |  |

### `ProductDetail`

PG-03: the product, its family, the products before and after it in the catalogue (PD-04) and up to four more from the same family (PD-05).

| Field | Type | Required | Notes |
|---|---|---|---|
| `product` | `ContentDoc` | yes |  |
| `family` | `ContentDoc` or null | yes |  |
| `previous` | `ProductLink` or null | yes |  |
| `next` | `ProductLink` or null | yes |  |
| `more_from_family` | list of `ContentDoc` | yes |  |

### `ProductLink`

| Field | Type | Required | Notes |
|---|---|---|---|
| `key` | string | yes |  |
| `ref` | string | yes |  |
| `name` | string | yes |  |

### `PublishIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `note` | string or null | no |  |

### `Redirect`

| Field | Type | Required | Notes |
|---|---|---|---|
| `source` | string | yes |  |
| `destination` | string | yes |  |
| `permanent` | boolean | no | default `true` |

### `SaveDraftIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `data` | object | yes | Content per language: {"en": {...}, "ar": {...}} |
| `revision` | integer or null | no | The draft revision you started from (null for a new draft) |
| `sort_order` | integer or null | no |  |

### `SiteManifest`

D55: everything the assistant may show on the website. `revision` changes on every publish.

| Field | Type | Required | Notes |
|---|---|---|---|
| `revision` | integer | yes |  |
| `built_at` | string (date-time) | yes |  |
| `pages` | list of `ManifestPage` | no | default `[]` |
| `families` | list of `ManifestFamily` | no | default `[]` |
| `products` | list of `ManifestProduct` | no | default `[]` |
| `chapters` | list of `ManifestChapter` | no | default `[]` |
| `product_pages` | boolean | no | default `false` |

### `SitemapEntry`

| Field | Type | Required | Notes |
|---|---|---|---|
| `path_en` | string | yes |  |
| `path_ar` | string | yes |  |
| `updated_at` | string (date-time) or null | yes |  |
| `kind` | `page` \| `product` \| `family` | yes |  |

### `UploadIn`

| Field | Type | Required | Notes |
|---|---|---|---|
| `filename` | string | yes | min length 1; max length 300 |
| `content_type` | string | yes | max length 100 |
| `size` | integer | yes | > 0.0 |
| `sha256` | string | yes | pattern `^[0-9a-f]{64}$` |
| `alt` | map of string | no |  |

### `UploadOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `asset_id` | string | yes |  |
| `object_key` | string | yes |  |
| `upload_url` | string or null | yes | PUT the file here (null: this file is already in the library) |
| `headers` | map of string | yes |  |
| `already_uploaded` | boolean | yes |  |

### `VersionOut`

| Field | Type | Required | Notes |
|---|---|---|---|
| `number` | integer | yes |  |
| `status` | `draft` \| `published` \| `archived` | yes |  |
| `revision` | integer | yes |  |
| `data` | object | yes |  |
| `author` | string | yes |  |
| `saved_at` | string (date-time) | yes |  |
| `published_at` | string (date-time) or null | yes |  |
| `published_by` | string or null | yes |  |
| `note` | string or null | yes |  |

### `VersionSummary`

| Field | Type | Required | Notes |
|---|---|---|---|
| `number` | integer | yes |  |
| `status` | `draft` \| `published` \| `archived` | yes |  |
| `author` | string | yes |  |
| `saved_at` | string (date-time) | yes |  |
| `published_at` | string (date-time) or null | yes |  |
| `published_by` | string or null | yes |  |
| `note` | string or null | yes |  |

