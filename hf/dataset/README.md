---
license: cc-by-4.0
language:
- en
pretty_name: CityAir Air-Quality Readiness Knowledge Base
size_categories:
- n<1K
task_categories:
- question-answering
- text-retrieval
tags:
- air-quality
- cities
- climate
- rag
- knowledge-base
- retrieval
- urban-planning
configs:
- config_name: kb
  data_files:
  - split: train
    path: amqx_cityair_kb.jsonl
---

# CityAir — Air-Quality Readiness Knowledge Base

This is the **retrieval corpus behind the CityAir assistant**. It is a compact, auditable
knowledge base about city air-quality management capacity, published open so that anyone can
verify what the assistant can and cannot answer from.

CityAir itself: <https://aqmx.atikova.com> · code: <https://github.com/Websites-by-AI/amqx-cityair>

## Contents

| File | What it is |
| --- | --- |
| `amqx_cityair_kb.jsonl` | 71 retrieval chunks (`id`, `title`, `text`, `tags`, `source`) — the corpus used by the RAG assistant |
| `amqx_cityair_kb.json` | the same chunks as a JSON array (convenient for `json.load`) |
| `cities.csv` | the 20 illustrative city profiles with the twelve domain scores, confidence and coordinates |
| `data/*.json` | the raw source data: `cities`, `guidance`, `innovations`, `questions`, `resources` |

## Chunk sources

| Chunks | Source |
| --- | --- |
| 20 | illustrative city library |
| 12 | guidance domains |
| 12 | assessment question set |
| 8 | public resources |
| 6 | innovation library |
| 13 | method, scoring, confidence, action-planning, WHO reference values, platform FAQ |

## How it is used

The Cloudflare Worker assistant runs BM25 retrieval over this corpus (optionally reranked with
`@cf/baai/bge-base-en-v1.5` embeddings), inserts the top six passages into the prompt, and asks a
language model to answer **only** from those passages and report them as sources. If no model is
available it returns the retrieved passages verbatim instead of inventing an answer.

Rebuild the corpus from source data with:

```bash
node tools/build-kb.mjs
```

## Important limitations

- City scores are **synthetic demonstration values** created for the prototype. They are not
  assessments of the real cities and must not be cited as such.
- The WHO guideline values included for reference must be confirmed against the official
  publication before any regulatory use.
- Text is CityAir's own synthesis of publicly documented practice and is not official guidance of
  any organisation. CityAir is an independent prototype and is not an official AQMx, CCAC, WRI,
  NASA, XPRIZE or WHO product.

## License

Text synthesised by the CityAir project is released under CC-BY-4.0. Reference names and links
remain the property of their respective owners.
