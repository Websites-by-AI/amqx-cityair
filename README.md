# 🌍 CityAir — Air-Quality Readiness & Innovation Exchange

An independent platform for city teams: diagnose air-quality management capacity across twelve
domains, identify evidence gaps, build a phased action plan, explore city context, review innovation
implementation briefs, and ask an AI assistant grounded in the platform's own published knowledge base.

| | |
| --- | --- |
| **Site** | https://aqmx.atikova.com |
| **Telegram bot** | [@AQMX_cityair_tracker_bot](https://t.me/AQMX_cityair_tracker_bot) |
| **Knowledge base (dataset)** | https://huggingface.co/datasets/sosa123454321/amqx-cityair-kb |
| **HF mirror (live)** | https://sosa123454321-amqx-cityair.static.hf.space |
| **Code** | https://github.com/Websites-by-AI/amqx-cityair |

> **Independent prototype.** Not an official AQMx, CCAC, WRI, NASA, XPRIZE or WHO product.
> Demonstration city scores are **synthetic** and are not official rankings.

---

## What is in this repository

```
amqx-cityair/
├─ app/                     React 19 + TypeScript + Tailwind 4 SPA (Vite, hash routing)
│  ├─ src/pages/            Home · Guidance · Assess · Results · ActionPlan · Cities ·
│  │                        Innovations · InnovationMatch · Resources · Methodology ·
│  │                        About · Assistant (12 routes + city detail)
│  ├─ src/components/       UI kit, SVG charts, layout, chat widget
│  ├─ src/lib/              assessment engine, API client, local BM25 retrieval
│  └─ src/data/             cities · guidance · innovations · resources · questions · kb.json
├─ worker/                  Cloudflare Worker: RAG API + Telegram bot + static assets
│  └─ src/                  index · ai (RAG) · retrieval (BM25) · aq (live data) · telegram
├─ hf/
│  ├─ dataset/              open knowledge base (jsonl + csv + raw JSON) + dataset card
│  ├─ space-rag/            Gradio RAG Space (HF-native model + dataset)
│  └─ space-static/         built mirror (generated)
├─ tools/
│  ├─ build-kb.mjs          regenerates the knowledge base from the data files
│  ├─ build-hf-space.mjs    builds the static HF Space mirror
│  ├─ deploy-cloudflare.sh  one-command Cloudflare deploy (Worker + assets + domain + webhook)
│  ├─ push-github.sh        pushes to GitHub (new repo + legacy repo refresh)
│  └─ upload-hf.sh          uploads dataset + both Spaces
└─ docs/DEPLOY.md           step-by-step deployment guide (Persian)
```

## Features

**Assessment (12 domains).** Five-step wizard — city context, weighted domain scoring (0–4 or
unknown/not applicable), nine evidence systems, evidence notes and links, stated priorities. Progress
is saved in the browser; assessments can be exported/imported as JSON.

**Scoring & confidence.** Domain score = weighted mean of normalised answers; readiness = weighted
mean of scored domains; maturity bands Starting → Leading. Evidence confidence = 60 % confirmed
systems + 25 % answers with evidence + 15 % completeness. Every limit is stated on the Methodology page.

**Dashboard & action plan.** Readiness gauge, confidence dial, domain bars, priority gaps and a
three-phase plan (0–6 / 6–18 / 18–36 months) generated from the weakest domains and stated priorities,
with print and text export.

**City explorer.** 20 illustrative profiles scored on the same twelve domains, searchable and
filterable, comparison of up to three cities, radar profiles, and **live PM₂.₅ / PM₁₀ / European AQI**
readings from the open Open-Meteo API.

**Innovation library & matching.** Six implementation briefs (problem, required capacity, required
data, steps, risks, adaptation, indicators) plus explainable matching against a saved assessment.

**AI assistant.** Cloudflare Worker RAG: BM25 retrieval over the 71-chunk knowledge base, optional
embedding rerank (`@cf/baai/bge-base-en-v1.5`), generation via Cloudflare Workers AI or Hugging Face
Inference, and **graceful degradation to retrieval-only answers** when no model is reachable — the
chat never invents content silently. Available as a floating widget, a full page and inline on the
results page, and it reports the passages it used.

**Telegram bot.** `/aqi <city>` live readings, `/city`, `/ask` knowledge-base questions,
`/subscribe` daily digest (with D1), `/help`, `/about` — same knowledge base as the site.

## Local development

```bash
# site
cd app && npm install && npm run dev            # http://localhost:5173

# full stack (site + API + bot webhook) in one Worker
node tools/build-kb.mjs                         # regenerate the knowledge base
cd app && npm run build                         # build the SPA into app/site
cd ../worker && npm install && npx wrangler dev # http://localhost:8787
```

Environment for the Worker: copy `worker/.dev.vars.example` to `worker/.dev.vars`.

## Deployment

Docs: **[link index](docs/LINKS.md)** · **[deployment guide](docs/DEPLOY.md)** · **[browser test report](docs/TEST-REPORT.md)** · **[status](docs/STATUS.md)**

Or run:

```bash
CLOUDFLARE_API_TOKEN=... CF_ACCOUNT_ID=... TELEGRAM_BOT_TOKEN=... bash tools/deploy-cloudflare.sh
GITHUB_TOKEN=... bash tools/push-github.sh
HF_TOKEN=... bash tools/upload-hf.sh "https://<worker>.workers.dev"
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | status, providers, KB size, Telegram webhook state |
| POST | `/api/chat` | RAG answer `{messages, context}` → `{answer, provider, sources}` |
| GET | `/api/aqi?city=` | live reading (Open-Meteo proxy) |
| GET | `/api/kb` | knowledge-base statistics |
| POST | `/api/telegram/webhook` | Telegram updates (secret-token verified) |
| POST | `/api/telegram/setup?key=` | register the webhook (admin key) |

## Data & privacy

Assessment answers live only in the visitor's browser (`localStorage`). No accounts, no analytics, no
tracking. The assistant receives the question text and, only when the user presses the button, a
summary of their scores. The knowledge base is public by design.

## License

Code MIT (`LICENSE`). Knowledge-base text CC-BY-4.0. Referenced organisation names and links remain
the property of their respective owners, and their presence implies no partnership or endorsement.
