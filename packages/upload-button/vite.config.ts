import { defineConfig } from "vite";
import { resolve } from "path";
import preact from "@preact/preset-vite";
import pkg from "./package.json";

// https://vite.dev/config/
export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: resolve(__dirname, "lib/index.ts"),
      name: "UploadButton",
      formats: ["es", "cjs"],
    },
    minify: false,
    rollupOptions: {
      external: [...Object.keys(pkg.peerDependencies || {})],
    },
  },
});
