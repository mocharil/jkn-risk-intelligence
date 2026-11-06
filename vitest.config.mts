import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(process.cwd(), ".") } },
  // Tes persistensi membangun seluruh store (±10 dtk sendiri); saat suite berjalan paralel di laptop yang lambat bisa melewati 30 dtk.
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 60_000 },
});
