import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    // Las imagenes de producto vienen de CDNs de Shopify y similares.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
