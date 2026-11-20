# Hand-off pack (frontend developer + QA tester)

Everything the website / CRM-screens developer and the QA tester need, in one place (D60). Almost everything here
is **generated from the code** by `make handoff` (`scripts/gen_handoff.py`), so it always matches the server.
Do not edit generated files by hand: change the code or the hand-written heads in `scripts/handoff_heads/`.

## Who reads what

| You are | Start with | Then |
|---|---|---|
| **Website developer** (Arifa Pack site, Next.js) | `FRONTEND_GUIDE.md` (or `.docx`) | `CMS_API.md` (content), `WEBSITE_API.md` (the AI assistant, enquiries), `postman/Kairox-CMS` and `postman/Kairox-Website` |
| **CRM screens developer** | `CRM_API.md` | `postman/Kairox-CRM` (or the hand-made `Kairox-CRM-quickstart`) |
| **QA tester** | `TESTER_HELPER.docx` | `postman/Kairox.postman_collection.json` (end-to-end, in test order) or one collection per package |

## What is in the pack

| File | What it is | Made by |
|---|---|---|
| `CRM_API.md` | CRM API: design, sign-in, conventions, then every endpoint with who may call it, request / response schema tables, JSON examples, and a data-shapes appendix | generated (head: `scripts/handoff_heads/crm_head.md`) |
| `CMS_API.md` | CMS (`kx.cms`): the content model, which site section reads which fields, how a publish reaches the website within a minute, preview, media, then every endpoint | generated (head: `cms_head.md`) |
| `WEBSITE_API.md` | Website API (`kx.agents`): the AI assistant session, `SiteContext` in, site actions out, streaming, events, contact and enquiry endpoints, voice data topics | generated (head: `web_head.md`) |
| `FRONTEND_GUIDE.md` / `.docx` | Step-by-step guide for the website developer (8 steps, each with a check) | hand-written; `.docx` by `build/md2docx.js` |
| `website-adapter/arifa-site-actions.patch` | The change the live test of 20 Nov ran on the website (Arifa-Pack `0e160eb`): context sent, site actions done. `git apply` it in the website repo | hand-made |
| `TESTER_HELPER.docx` | The tester's guide: setup, roles, first sign-in, end-to-end scenarios, negative tests, bug template, endpoint list | `build/build_tester_guide.js` |
| `openapi/openapi-*.json` | OpenAPI 3.1 per API, for a mock server (Prism) or a client generator | generated |
| `postman/Kairox.postman_collection.json` | End-to-end collection: one request per route in test order + folder 14 (must be refused). The TESTER_HELPER scenarios use it | generated |
| `postman/Kairox-CRM`, `-CMS`, `-Website`, `-Automation` `.postman_collection.json` | The same requests, one self-contained collection per package (health, staff sign-in where needed, its own negative tests). Staff collections renew the 15-minute token by themselves | generated |
| `postman/Kairox-CRM-quickstart.postman_collection.json` | Hand-made short CRM collection for developers (sign in once, a few example calls) | hand-made |
| `postman/Kairox-local` / `Kairox-staging` `.postman_environment.json` | Settings for the developer's live-test stack (`http://localhost:38000`) and for staging (secrets blank) | generated |
| `vectors/site-nav.json` | Test vectors for the assistant's instant navigation resolver (the website's layer 0 uses the same); 65 cases checked against the real site | copied by `make handoff` from `kx/agents/evals/site_nav/cases.json` |
| `endpoints.json` | Every route as data (method, path, package, who, MFA, purpose, expected status); read by both Word guides | generated |
| `CMS.md`, `CHANGES_18NOV.md` | History: the earlier Payload CMS contract (replaced by `CMS_API.md`, D54) and the 18 Nov change note | hand-written |

## Regenerate (after any API change)

```bash
# 1. API docs, OpenAPI, Postman files, endpoints.json: offline, no database or network
make handoff                                   # = uv run python scripts/gen_handoff.py
# 2. the Word guides (need the `docx` npm package; install it outside the repo once:
#    npm install --prefix "$TEMP/kxdocx" docx@9   and   export NODE_PATH="$TEMP/kxdocx/node_modules")
node docs/handoff/build/build_tester_guide.js
node docs/handoff/build/md2docx.js docs/handoff/FRONTEND_GUIDE.md docs/handoff/FRONTEND_GUIDE.docx "Frontend guide: the website and the Kairox backend"
node docs/handoff/build/build_frontend_guide.js
```

The generator stops with an error when the number of OpenAPI operations and Postman requests differ, or when the
per-package split loses a request. CI (`.github/workflows/handoff.yml`) regenerates step 1 and fails when the
committed files are out of date.

Never put passwords, authenticator keys or real customer data into these files; staging and production secrets
go only into a tester's own Postman "Current value".
