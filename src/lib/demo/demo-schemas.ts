/**
 * Sample content types for sample mode, shaped like CMS_API.md §3 (the real backend sends its own JSON Schemas from
 * GET /v1/cms/collections; the editor draws whatever it receives).
 */
type Schema = Record<string, unknown>;

const text = (title: string, maxLength = 200): Schema => ({ type: "string", title, maxLength });
const longText = (title: string): Schema => ({ type: "string", title, maxLength: 4000 });
const list = (title: string, items: Schema): Schema => ({ type: "array", title, items });
const object = (title: string, properties: Record<string, Schema>, required: string[] = []): Schema => ({ type: "object", title, properties, required });
const media = (title: string): Schema => ({ $ref: "#/$defs/MediaRef", title });
const flag = (title: string): Schema => ({ type: "boolean", title });

const DEFS = {
  MediaRef: object("Media", { asset_id: text("Media library file"), url: text("Or an outside link (e.g. YouTube)", 500) }),
};
const seo = object("SEO", { title: text("Search title", 70), description: text("Search description", 160) });
const faq = object("Question", { question: text("Question", 300), answer: longText("Answer") }, ["question", "answer"]);
const block = object(
  "Section",
  {
    section_id: text("Section id (do not rename: the website and the AI use it)", 64),
    design_id: text("Design id", 16),
    kind: text("Kind", 32),
    eyebrow: text("Eyebrow", 80),
    heading: text("Heading"),
    body: longText("Body"),
    media: list("Media", media("Media")),
    items: list("Items", object("Item", { title: text("Title"), text: longText("Text"), media: media("Media"), link: text("Link", 500) })),
    buttons: list("Buttons", object("Button", { label: text("Label", 60), link: text("Link", 500) })),
    keywords: list("Keywords (words that lead the AI to this section)", text("Keyword", 60)),
    hidden: flag("Hidden"),
  },
  ["section_id"],
);

const schema = (properties: Record<string, Schema>, required: string[] = []): Schema => ({ $defs: DEFS, ...object("", properties, required) });

export const SAMPLE_COLLECTIONS: { name: string; title: string; single: boolean; json_schema: Schema }[] = [
  {
    name: "site", title: "Site settings", single: true,
    json_schema: schema({
      company_name: text("Company name"),
      phones: list("Phones", text("Phone", 40)),
      emails: list("Emails", text("Email", 200)),
      addresses: list("Addresses", object("Address", { label: text("Label", 80), text: longText("Address") })),
      hours: text("Opening hours"),
      social: list("Social links", object("Link", { network: text("Network", 40), url: text("Link", 500) })),
      announcement: text("Announcement bar", 160),
      theme: object("Theme", { colour_primary: text("Main colour", 9), colour_accent: text("Accent colour", 9), font_heading: text("Heading font", 60), font_body: text("Text font", 60) }),
      assistant: object("Assistant texts", { greeting: longText("Greeting"), recording_notice: longText("Recording notice"), hand_over: longText("Hand-over"), busy: longText("Busy"), offline: longText("Offline") }),
      product_pages: flag("Product pages live"),
    }, ["company_name"]),
  },
  { name: "pages", title: "Pages", single: false, json_schema: schema({ title: text("Title"), path: text("Path", 200), seo, faqs: list("FAQs", faq), blocks: list("Sections", block) }, ["title", "path"]) },
  {
    name: "families", title: "Product families", single: false,
    json_schema: schema({ name: text("Name"), short_name: text("Short name", 40), blurb: longText("Blurb"), clip: media("Clip"), hero: media("Hero"), accent_colour: text("Accent colour", 9), synonyms: list("What visitors call it", text("Word", 60)), seo }, ["name"]),
  },
  {
    name: "products", title: "Products", single: false,
    json_schema: schema({
      family: text("Family (key)", 64), ref: text("Ref", 32), code: text("Code", 32), name: text("Name"), qty: text("Packing", 80),
      range: { type: "string", title: "Range", enum: ["trade", "self"] },
      short_description: text("Short description", 300), description: longText("Description"),
      specs: object("Specification", { material: text("Material"), capacity: text("Capacity"), dimensions: text("Dimensions"), thickness: text("Thickness"), colours: text("Colours"), lid_options: text("Lid options") }),
      oven: flag("Oven safe"), microwave: flag("Microwave safe"), freezer: flag("Freezer safe"),
      applications: list("Applications", text("Application", 80)),
      photos: list("Photos", media("Photo")), video: media("Video"), datasheet: media("Datasheet (PDF)"), model: media("3D model (GLB)"),
      faqs: list("FAQs", faq), legacy_paths: list("Old-site addresses", text("Path", 300)), seo,
    }, ["family", "name"]),
  },
  { name: "tour_chapters", title: "Factory tour chapters", single: false, json_schema: schema({ title: text("Title"), seconds: { type: "integer", title: "Film time (seconds)", minimum: 0 }, family: text("Family (key)", 64) }, ["title"]) },
  { name: "stations", title: "Quality stations", single: false, json_schema: schema({ title: text("Title"), text: longText("What is checked") }, ["title"]) },
  { name: "faqs", title: "FAQs", single: false, json_schema: schema({ question: text("Question", 300), answer: longText("Answer") }, ["question", "answer"]) },
  { name: "certificates", title: "Certificates", single: false, json_schema: schema({ title: text("Title"), issuer: text("Issuer"), file: media("Certificate file"), valid_until: { type: "string", title: "Valid until", format: "date" } }, ["title"]) },
  { name: "clients", title: "Clients", single: false, json_schema: schema({ name: text("Name"), logo: media("Logo"), sample: flag("Sample (until Arifa approves)") }, ["name"]) },
  { name: "industries", title: "Industries", single: false, json_schema: schema({ name: text("Trade"), use: longText("How they use the products"), product_kit: list("Product kit", text("Product key", 64)), sample: flag("Sample (until Arifa approves)") }, ["name"]) },
  { name: "stories", title: "Stories", single: false, json_schema: schema({ title: text("Title"), quote: longText("Quote"), client: text("Client"), sample: flag("Sample (until Arifa approves)") }, ["title"]) },
  { name: "leadership", title: "Leadership", single: false, json_schema: schema({ name: text("Name"), role: text("Role"), quote: longText("Quote"), message: longText("Message"), photo: media("Photo") }, ["name", "role"]) },
];
