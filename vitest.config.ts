import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      reportsDirectory: "coverage",
      lines: 70,
      functions: 70,
      branches: 60,
      statements: 70
    }
  }
});
