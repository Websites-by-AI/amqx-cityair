#!/usr/bin/env node
/**
 * CityAir — research pass for the AI claims made in partner messages / emails.
 *
 *   HF_TOKEN=hf_… node tools/ai-research.mjs
 *
 * For every claim in CLAIMS it queries the Hugging Face Hub (models, Spaces, datasets)
 * and Hugging Face Papers (the successor of Papers with Code, which now redirects there)
 * and writes app/src/data/ai-research.json (public-safe: no private letter text).
 * Papers are kept only when a code repository is linked, so each row has a code link.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "app", "src", "data", "ai-research.json");
const TOKEN = process.env.HF_TOKEN || "";
const HDR = TOKEN ? { authorization: `Bearer ${TOKEN}` } : {};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, { headers: HDR });
      if (res.ok) return await res.json();
      if (res.status === 429) await sleep(3000 * (i + 1));
      else return null;
    } catch {
      await sleep(1500);
    }
  }
  return null;
}

/** Relevance rules: a paper / Hub item must match EVERY pattern in `must` (case-insensitive). */
const RULES = {
  C1: [/retrieval|\bRAG\b/i],
  C2: [/PM\s?2\.?5|air (quality|pollution)|aerosol/i, /satellite|remote sensing|sentinel|earth observation/i],
  C3: [/fire|burn|thermal anomal|hotspot/i, /satellite|remote sensing|earth observation/i],
  C4: [/methane/i, /satellite|plume|remote sensing|landfill/i],
  C5: [/air (quality|pollution)|PM\s?2\.?5/i, /forecast|predict|spatio|urban|model/i],
  C6: [/air (quality|pollution)|PM\s?2\.?5/i, /sensor|calibrat|citizen|low-cost|monitor/i],
};
const HUB_RULES = {
  C1: /\brag\b|retriev/i,
  C2: /pm\s?25|pm2\.?5|air[-_ ]?quality|aerosol/i,
  C3: /fire|wildfire|smoke/i,
  C4: /methan|plume|\bch4\b/i,
  C5: /air[-_ ]?quality|pm\s?25|pm2\.?5/i,
  C6: /air[-_ ]?quality|pm\s?25|pm2\.?5|sensor|calibrat/i,
};
const hubRelevant = (claimId, text) => (HUB_RULES[claimId] ? HUB_RULES[claimId].test(text || "") : false);
const relevant = (claimId, text) => (RULES[claimId] || []).every((re) => re.test(text || ""));

/** Each claim: what the project says (public-safe paraphrase) + search terms. */
export const CLAIMS = [
  {
    id: "C1",
    claim: "CityAir's AI assistant answers only from a grounded knowledge base (retrieval-augmented generation, RAG) and cites its sources.",
    origin: "CityAir platform (own product)",
    models: ["rag", "retrieval"],
    spaces: ["rag chatbot", "rag"],
    datasets: ["rag"],
    papers: ["retrieval augmented generation", "RAG question answering large language model", "retrieval-augmented generation evaluation", "grounded answers citations retrieval LLM", "BM25 dense retrieval RAG"],
  },
  {
    id: "C2",
    claim: "Satellite Earth-observation data (Sentinel-2 and similar) is validated against ground air-quality sensors, and machine learning turns it into PM2.5 estimates.",
    origin: "Email to MoveGreen (validation with ground sensors); MoveGreen reply (validating EO data)",
    models: ["pm25", "air quality"],
    spaces: ["air quality", "pm25"],
    datasets: ["air quality", "pm25"],
    papers: ["PM2.5 estimation satellite machine learning", "aerosol optical depth PM2.5 deep learning", "satellite air quality ground monitoring fusion", "Sentinel-2 air pollution", "remote sensing air pollution estimation", "ground-level PM2.5 satellite", "air quality remote sensing deep learning"],
  },
  {
    id: "C3",
    claim: "Satellite thermal alerts (NASA FIRMS) and deep learning can detect open waste burning, landfill fires and other environmental-risk hotspots.",
    origin: "Email to MoveGreen (FIRMS, thermal anomaly detection, waste-burning hotspots)",
    models: ["fire detection", "wildfire"],
    spaces: ["wildfire", "fire detection"],
    datasets: ["wildfire", "fire detection"],
    papers: ["active fire detection satellite deep learning", "wildfire detection satellite images", "burned area mapping Sentinel-2", "fire smoke detection satellite", "thermal anomaly hotspot satellite", "open burning detection remote sensing"],
  },
  {
    id: "C4",
    claim: "Diffuse methane emissions from landfills and waste sites can be located and quantified from satellite data with machine learning (XPRIZE Mission Methane).",
    origin: "Email to MoveGreen (methane baseline, XPRIZE Mission Methane)",
    models: ["methane"],
    spaces: ["methane"],
    datasets: ["methane"],
    papers: ["methane plume detection satellite", "methane emission detection Sentinel-2 deep learning", "methane point source satellite machine learning", "landfill methane satellite", "methane retrieval satellite imagery"],
  },
  {
    id: "C5",
    claim: "AI forecasting and spatial models can produce an urban air-quality baseline and identify pollution hotspots for cities.",
    origin: "Juliet note (AI model presented for COP31 green startups); MoveGreen reply (air-quality baseline)",
    models: ["air quality", "pm25"],
    spaces: ["air quality", "pm25"],
    datasets: ["air quality"],
    papers: ["urban air quality forecasting", "air pollution forecasting graph neural network", "PM2.5 forecasting deep learning", "air quality prediction spatio-temporal", "air pollution hotspot city machine learning"],
  },
  {
    id: "C6",
    claim: "Low-cost community sensors, calibrated with machine learning, can support independent citizen-science air monitoring.",
    origin: "MoveGreen reply (independent monitoring, citizen engagement); CityAir sensor section",
    models: ["air quality sensor", "air quality"],
    spaces: ["air quality sensor", "pm25"],
    datasets: ["air quality", "pm25"],
    papers: ["low-cost air quality sensor calibration", "low-cost PM2.5 sensor machine learning correction", "citizen science air pollution sensors", "community air quality monitoring", "air quality sensor network calibration"],
  },
];

async function hubSearch(claimId, kind, query, limit = 5) {
  const data = await getJson(`https://huggingface.co/api/${kind}?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}`);
  return (Array.isArray(data) ? data : []).filter((x) => hubRelevant(claimId, `${x.id} ${(x.tags || []).slice(0, 12).join(" ")}`)).map((x) => ({
    id: x.id,
    url: `https://huggingface.co/${kind === "models" ? "" : kind + "/"}${x.id}`,
    downloads: x.downloads ?? null,
    likes: x.likes ?? null,
    task: x.pipeline_tag ?? x.sdk ?? null,
  }));
}

async function paperSearch(query) {
  const data = await getJson(`https://huggingface.co/api/papers/search?q=${encodeURIComponent(query)}`);
  return (Array.isArray(data) ? data : []).map((r) => r.paper).filter(Boolean);
}

async function paperDetail(id) {
  return getJson(`https://huggingface.co/api/papers/${id}`);
}

async function gatherPapers(claimId, queries, want = 10) {
  // tier 1 = strict match (every rule pattern); tier 2 = broader match (first rule only)
  const strict = new Map(), broader = new Map();
  const first = (RULES[claimId] || [])[0];
  for (const q of queries) {
    for (const p of await paperSearch(q)) {
      const text = `${p.title} ${p.summary ?? ""}`;
      if (relevant(claimId, text)) strict.set(p.id, p);
      else if (first && first.test(text)) broader.set(p.id, p);
    }
    await sleep(300);
  }
  const rows = [];
  const take = async (pool, tier, allowNoCode = false) => {
    for (const p of pool.values()) {
      if (rows.length >= want) return;
      if (rows.some((r) => r.arxivId === p.id)) continue;
      const detail = (await paperDetail(p.id)) ?? {};
      await sleep(200);
      const githubRepo = detail.githubRepo || p.githubRepo || null;
      if (!githubRepo && !allowNoCode) continue; // first pass: only papers that link a code repository
      rows.push({
        title: (p.title || "").replace(/\s+/g, " ").trim(),
        arxivId: p.id,
        url: `https://huggingface.co/papers/${p.id}`,
        arxiv: `https://arxiv.org/abs/${p.id}`,
        published: (p.publishedAt || "").slice(0, 10),
        upvotes: p.upvotes ?? detail.upvotes ?? 0,
        code: githubRepo, // null = no code repository linked on Hugging Face Papers
        stars: detail.githubStars ?? p.githubStars ?? null,
        match: tier,
      });
    }
  };
  await take(strict, "exact");
  await take(broader, "broader");
  // second pass: fill up to `want` with relevant papers that have no linked code (flagged)
  await take(strict, "exact", true);
  await take(broader, "broader", true);
  return rows.sort((a, b) => (b.code ? 1 : 0) - (a.code ? 1 : 0) || (a.match === "exact" ? 0 : 1) - (b.match === "exact" ? 0 : 1) || (b.stars ?? 0) - (a.stars ?? 0));
}

const out = { generatedAt: new Date().toISOString(), source: "Hugging Face Hub + Hugging Face Papers (Papers with Code successor)", claims: [] };
for (const c of CLAIMS) {
  const models = [];
  for (const q of c.models) models.push(...(await hubSearch(c.id, "models", q, 3)));
  const spaces = [];
  for (const q of c.spaces) spaces.push(...(await hubSearch(c.id, "spaces", q, 3)));
  const datasets = [];
  for (const q of c.datasets) datasets.push(...(await hubSearch(c.id, "datasets", q, 3)));
  const uniq = (arr) => [...new Map(arr.map((x) => [x.id, x])).values()].slice(0, 6);
  const papers = await gatherPapers(c.id, c.papers, 10);
  out.claims.push({
    id: c.id,
    claim: c.claim,
    origin: c.origin,
    hf: { models: uniq(models), spaces: uniq(spaces), datasets: uniq(datasets) },
    papers,
  });
  console.log(`${c.id}: models ${uniq(models).length} · spaces ${uniq(spaces).length} · datasets ${uniq(datasets).length} · papers-with-code ${papers.length}`);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2));
console.log("wrote", OUT);
