import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig, transformWithOxc } from "vite-plus";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [
    {
      name: "motion-source",
      async load(id) {
        if (!id.endsWith("?motion-source")) return;
        const filename = id.slice(0, -"?motion-source".length);
        this.addWatchFile(filename);
        const source = await readFile(filename, "utf8");
        const result = await transformWithOxc(source, filename, { jsx: "preserve" });
        return `export default ${JSON.stringify(result.code)};`;
      },
    },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    license: { fileName: "licenses/dependencies.md" },
  },
  fmt: {
    ignorePatterns: ["src/motion/reference/**", "src/motion/engine/bot-engine-bundle.js"],
  },
  test: {
    exclude: [...configDefaults.exclude, "**/.worktrees/**"],
  },
  lint: {
    ignorePatterns: ["src/motion/reference/**", "src/motion/engine/bot-engine-bundle.js"],
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
