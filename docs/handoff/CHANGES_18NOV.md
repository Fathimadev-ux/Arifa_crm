# What changed for the frontend on 18 Nov

For the two frontend developers (website; CRM + CMS). Full detail is in `CRM_API.md` (sections 5.1-5.4, the
screen table and the generated endpoint reference), `CMS.md` (sections 2 and 5) and `openapi-crm.json`.

## CRM developer: four new screens

| Screen | Who | Endpoints | Section |
|---|---|---|---|
| **Product workbook** (Catalogue): Download, Upload -> preview of every change and every error, Apply | manager, MD, admin (authenticator sign-in) | `GET /v1/catalogue/workbook`, `POST /v1/catalogue/workbook/preview`, `POST /v1/catalogue/workbook/apply?token=` | CRM_API 5.1 |
| **Message texts** (Settings): edit the English wording of AI phrases, buyer messages, staff alerts; status per language; history; reset | edit: manager, MD; view: + admin | `GET /v1/texts`, `PUT /v1/texts/{key}`, `POST /v1/texts/{key}/reset`, `GET /v1/texts/{key}/history`, `POST /v1/texts/translate-missing` | CRM_API 5.2 |
| **WhatsApp / email templates** (Settings): versions; the live one keeps sending while a new version waits for Meta | manager, MD, admin | `GET /v1/admin/message-templates?current_only=true`, `PUT /v1/admin/message-templates`, `POST /v1/admin/message-templates/{id}/status` | CRM_API 5.2 |
| **Company details** (Settings): letterhead, TRN, logo upload, bank details, live preview | admin, MD, manager | `GET/PATCH /v1/company`, `PUT/DELETE /v1/company/logo` | CRM_API 5.3 |

Also: the FX screen shows automatic rates (`source = auto:open-er-api`) next to the manager's own (5.4).

## CMS developer

* The platform now **writes product drafts** into the CMS from the workbook (section 5 of CMS.md): please use
  the field names listed there (`code`, `name`, `title`, `category`, `shortDescription`, `descriptionText`,
  `moq`, `unit`, `customPrinting`, group `specs` {material, capacity, dimensions, thickness, colours,
  lidOptions}), enable drafts on `products` and `product-categories`, and give the API-key user create / update
  rights on drafts (not publish).
* The publish webhook's `product.spec` should carry the same keys (CMS.md section 2), so the CRM's copy matches.
* Editors publish the drafts after preview; photos and rich text are never overwritten by the workbook.

## Website developer

* Product pages read the CMS fields above (`shortDescription`, `descriptionText`, `specs.*`, `moq`, `unit`):
  align the product detail template with the CMS developer.
* No change to the website API (`WEBSITE_API.md`).
