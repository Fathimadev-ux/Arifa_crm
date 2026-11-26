import type { NextConfig } from "next";

/** The backend (FastAPI). Set API_URL locally in .env.local and on Vercel; if nothing answers, the CRM shows sample data. */
const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // The /v1 forwarding gives up after 30 s by default, which cut big downloads (the product workbook) halfway.
    proxyTimeout: 120_000,
  },
  partialPrefetching: true,
  // The browser only talks to this site; /v1 is forwarded to the backend, so the login cookie stays first-party.
  rewrites: async () => [{ source: "/v1/:path*", destination: `${API_URL}/v1/:path*` }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
