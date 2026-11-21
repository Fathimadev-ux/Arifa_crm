/**
 * First start: an admin account, and the current arifapack.com content (word for word, from
 * data/website-content.ts) as published Payload documents: the home page, the product categories, site settings.
 * Runs only while the database is empty.
 */
import path from "node:path";
import type { Payload } from "payload";
import { DEFAULT_CONTENT } from "@/data/website-content";

/** Change it after the first sign-in (Account → Change password). */
const FIRST_ADMIN = { email: "admin@arifapack.com", password: process.env.CMS_FIRST_ADMIN_PASSWORD || "arifa-cms-2026", name: "Admin", role: "admin" as const };

const context = { seeding: true };
const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function seed(payload: Payload) {
  if ((await payload.count({ collection: "users" })).totalDocs === 0) {
    await payload.create({ collection: "users", data: FIRST_ADMIN, context });
    payload.logger.info(`First admin created: ${FIRST_ADMIN.email}`);
  }
  if ((await payload.count({ collection: "pages" })).totalDocs > 0) return;

  payload.logger.info("Adding the arifapack.com content…");
  const uploaded = new Map<string, number>();
  /** The site's images (public/images) into the media library, each once. */
  const upload = async (src: string, alt: string) => {
    if (!src) return undefined;
    if (!uploaded.has(src)) {
      const doc = await payload.create({ collection: "media", data: { alt }, filePath: path.join(process.cwd(), "public", src), context });
      uploaded.set(src, doc.id);
    }
    return uploaded.get(src);
  };

  const { settings, hero, products, about, sustainability, essentials, services, leadership, contact } = DEFAULT_CONTENT;
  const published = { _status: "published" as const };

  for (const [index, product] of products.entries()) {
    await payload.create({
      collection: "product-categories",
      context,
      data: { ...published, title: product.name, code: slugify(product.name).toUpperCase(), order: index, description: product.description, rating: product.rating, heroImage: await upload(product.image, product.name) },
    });
  }

  await payload.create({
    collection: "pages",
    context,
    data: {
      ...published,
      title: "Home",
      slug: "home",
      seo: { metaTitle: settings.pageTitle, metaDescription: settings.metaDescription, includeInSitemap: true, hideFromSearch: false },
      layout: [
        { blockType: "hero", slides: await Promise.all(hero.map(async ({ title, tagline, subtext, image, productsButtonLabel, contactButtonLabel }) => ({ title, tagline, subtext, image: (await upload(image, "Arifa Pack packaging"))!, productsButtonLabel, contactButtonLabel }))) },
        { blockType: "productCategories", heading: about.productsHeading },
        { blockType: "about", companyName: about.companyName, heading: about.heading, intro: about.intro, paragraphs: about.paragraphs.map((text) => ({ text })), image: await upload(about.image, about.heading), pillars: about.pillars.map((label) => ({ label })) },
        { blockType: "sustainability", eyebrow: sustainability.eyebrow, heading: sustainability.heading, statValue: sustainability.statValue, statText: sustainability.statText, features: sustainability.features.map(({ title, text }) => ({ title, text })) },
        { blockType: "essentials", heading: essentials.heading, categories: await Promise.all(essentials.categories.map(async ({ title, icon, items }) => ({ title, icon: await upload(icon, title), items: items.map((label) => ({ label })) }))) },
        { blockType: "services", heading: services.heading, intro: services.intro, services: services.services.map(({ title, text }) => ({ title, text })), buttonLabel: services.buttonLabel },
        { blockType: "leadership", eyebrow: leadership.eyebrow, heading: leadership.heading, members: await Promise.all(leadership.members.map(async ({ name, role, photo }) => ({ name, role, photo: await upload(photo, name) }))) },
        { blockType: "contact", eyebrow: contact.eyebrow, heading: contact.heading, submitLabel: contact.submitLabel },
      ],
    },
  });

  const { headOfficeAddress, headOfficePhone, headOfficeEmail, divisionName, divisionAddress, divisionPhone, divisionEmail } = contact;
  await payload.updateGlobal({
    slug: "site-settings",
    context,
    data: {
      brandName: settings.brandName,
      logo: await upload(settings.logo, settings.brandName),
      pageTitle: settings.pageTitle,
      metaDescription: settings.metaDescription,
      headOfficeAddress, headOfficePhone, headOfficeEmail, divisionName, divisionAddress, divisionPhone, divisionEmail,
    },
  });
  payload.logger.info("arifapack.com content added and published");
}
