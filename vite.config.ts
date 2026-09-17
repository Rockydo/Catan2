import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  base: "./",
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/game/**/*.ts"],
      exclude: ["src/game/types.ts", "src/game/content.ts"],
      reporter: ["text", "json-summary", "html"],
    },
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      input: {
        game: "index.html",
        rules: "rules.html",
        frenchRules: "rules-fr.html",
      },
    },
  },
});
