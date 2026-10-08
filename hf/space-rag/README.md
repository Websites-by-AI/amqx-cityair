---
title: CityAir RAG Assistant
emoji: 🌍
colorFrom: blue
colorTo: green
sdk: gradio
sdk_version: 5.38.0
app_file: app.py
pinned: false
license: mit
short_description: Ask the CityAir air-quality knowledge base (RAG).
---

# 🌍 CityAir RAG Assistant

A Hugging Face-native version of the CityAir assistant: it loads the open knowledge base
[`sosa123454321/amqx-cityair-kb`](https://huggingface.co/datasets/sosa123454321/amqx-cityair-kb),
retrieves the most relevant passages, and answers **only** from them — reporting the passages used.

- Retrieval: BM25 over the 71-chunk CityAir corpus (source data in `data/`)
- Generation: Hugging Face Inference Providers (set the `HF_TOKEN` Space secret with a token that
  has permission to *call Inference Providers*), with graceful degradation to a retrieval-only
  answer when no model is reachable
- Live readings: Open-Meteo air-quality API (no key required)

> CityAir is an independent prototype; it is not an official AQMx, CCAC, WRI, NASA, XPRIZE or WHO
> product, and demonstration city data is illustrative.

**Main site:** <https://aqmx.atikova.com> · **Code:** <https://github.com/Websites-by-AI/amqx-cityair>
