import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://arifapack.com";

/** The website is open to search engines; the admin panel, its API and draft previews are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/preview"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
