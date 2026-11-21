import path from "node:path";
import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";
import { ProductCategories, Products } from "./collections/Catalogue";
import { Media } from "./collections/Media";
import { Pages } from "./collections/Pages";
import { Certificates, ClientLogos, Enquiries, Faqs, Testimonials, TourHotspots } from "./collections/Trust";
import { Users } from "./collections/Users";
import { SiteSettings } from "./globals/SiteSettings";
import { migrations } from "./migrations";
import { seed } from "./seed/seed";
import { MAX_UPLOAD_MB } from "./cms/limits";

const srcDir = path.resolve(process.cwd(), "src");

/**
 * Arifa's CMS (CMS.md). The admin panel is at /admin, the REST API at /api. Locally the data is one SQLite
 * file; set DATABASE_URI for a shared database.
 */
export default buildConfig({
  admin: {
    user: Users.slug,
    meta: { titleSuffix: " · Arifa CMS", icons: [{ rel: "icon", url: "/images/logo/logo-600-600.png" }] },
    // The CRM look: our side menu, start page and initials avatar in place of Payload's.
    avatar: { Component: "/components/admin/Avatar#Avatar" },
    components: {
      graphics: { Logo: "/components/admin/Brand#Logo", Icon: "/components/admin/Brand#Icon" },
      Nav: "/components/admin/AdminNav#AdminNav",
      providers: ["/components/admin/Backdrop#Backdrop"],
      views: { dashboard: { Component: "/components/admin/Dashboard#Dashboard" } },
    },
    importMap: { baseDir: srcDir },
  },
  collections: [Pages, ProductCategories, Products, TourHotspots, Faqs, Certificates, ClientLogos, Testimonials, Media, Enquiries, Users],
  globals: [SiteSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  // Development creates tables on its own; production applies the migrations in src/migrations (npm run payload migrate:create after a field change).
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URI || "file:./cms.db" }, prodMigrations: migrations }),
  upload: { limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 } },
  sharp,
  typescript: { outputFile: path.resolve(srcDir, "payload-types.ts") },
  onInit: seed,
});
