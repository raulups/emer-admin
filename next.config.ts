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
  async redirects() {
    return [
      { source: "/scrapes", destination: "/scraper", permanent: false },
      { source: "/scrapes/:id", destination: "/scraper/:id", permanent: false },
    ];
  },
};

export default nextConfig;
