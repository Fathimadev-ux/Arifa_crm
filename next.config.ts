import type { NextConfig } from "next";

/** The backend (FastAPI). Set API_URL locally in .env.local and on Vercel; if nothing answers, the CRM shows sample data. */
const API_URL = process.env.API_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  cacheComponents: true,
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
