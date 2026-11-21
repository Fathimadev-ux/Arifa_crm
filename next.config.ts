import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Uploaded media (Payload) and the site's own images.
    localPatterns: [{ pathname: "/api/media/file/**" }, { pathname: "/images/**" }],
  },
  turbopack: {
    rules: {
      // Tailwind only for the website's stylesheet; the Payload admin keeps its own CSS untouched.
      "*.tw.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withPayload(nextConfig, { devBundleServerPackages: false });
