import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// VITE_API_BASE:
//   ""            -> same-origin /api/* (used when the site and the Worker are
//                    served from the same host, e.g. Cloudflare Worker + static assets)
//   "https://..."  -> absolute Worker origin (used for GitHub Pages / Hugging Face Space mirrors)
export default defineConfig(() => ({
  plugins: [react(), tailwindcss()],
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "src"),
    },
  },
  build: {
    outDir: "site",
    target: "es2020",
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
}));
