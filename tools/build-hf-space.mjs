#!/usr/bin/env node
/**
 * Builds the static Hugging Face Space mirror from app/dist.
 *
 * Output: hf/space-static/
 *   index.html (with window.AMQX_API injected so the mirror can still reach the API)
 *   assets/, images/, favicon.svg, robots.txt
 *   README.md  (Space card)
 *   .gitattributes
 *
 * Usage: node tools/build-hf-space.mjs ["https://amqx-cityair.<subdomain>.workers.dev"]
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dist = join(root, "app", "site");
const out = join(root, "hf", "space-static");
const apiBase = process.argv[2] ?? "";

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(dist, out, { recursive: true });

// Inject the API base so the mirror's assistant works against the Worker.
const index = readFileSync(join(out, "index.html"), "utf8");
const injected = index.replace(
  "</head>",
  `    <script>window.AMQX_API = ${JSON.stringify(apiBase)};</script>\n  </head>`,
);
writeFileSync(join(out, "index.html"), injected);

writeFileSync(
  join(out, "README.md"),
  `---
title: CityAir — Air-Quality Readiness
emoji: 🌍
colorFrom: blue
colorTo: green
sdk: static
pinned: false
license: mit
short_description: City air-quality readiness, innovations, AI assistant.
---

# 🌍 CityAir — Air-Quality Readiness & Innovation Exchange

Static mirror of **CityAir**, an independent platform for city air-quality teams:

- twelve-domain readiness assessment with evidence-confidence scoring
- 20 illustrative city profiles + live PM readings (Open-Meteo)
- innovation implementation briefs with explainable matching
- AI assistant grounded in the published CityAir knowledge base

**Main site:** https://aqmx.atikova.com
**Knowledge base (dataset):** https://huggingface.co/datasets/sosa123454321/amqx-cityair-kb
**Code:** https://github.com/Websites-by-AI/amqx-cityair

> CityAir is a prototype. It is not an official AQMx, CCAC, WRI, NASA, XPRIZE or WHO product.
> Demonstration city data is illustrative and is not an official ranking.

${
  apiBase
    ? `\nThe assistant on this mirror calls the CityAir API at \`${apiBase}\`.\n`
    : `\n_Build note: this mirror was generated without an API base URL, so the assistant runs in local retrieval-only mode._\n`
}
`,
);

// --- per-route files so "#"-less deep links work on static hosts (HF, Pages, Netlify) ---
// Each route directory simply contains the app shell; the bootstrap script in index.html
// turns /cities/bishkek into /#/cities/bishkek before React mounts.
const STATIC_ROUTES = [
  "expo",
  "partners",
  "guidance",
  "assess",
  "results",
  "action-plan",
  "cities",
  "innovations",
  "innovation-match",
  "resources",
  "methodology",
  "about",
  "assistant",
];

const cityIds = JSON.parse(
  readFileSync(join(root, "app", "src", "data", "cities.json"), "utf8"),
).map((city) => city.id);

const routes = [...STATIC_ROUTES, ...cityIds.map((id) => `cities/${id}`)];
for (const route of routes) {
  const dir = join(out, route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), injected);
}
writeFileSync(join(out, "not-found.html"), injected);

writeFileSync(join(out, ".gitattributes"), "* text=auto\n*.jpg binary\n*.png binary\n");

console.log(`Hugging Face static space built at ${out} (api base: ${apiBase || "none"})`);
console.log(`  route fallbacks generated: ${routes.length + 1}`);
