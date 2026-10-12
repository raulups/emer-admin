import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resuelve el alias `@/*` del tsconfig sin plugins.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
