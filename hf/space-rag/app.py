# -*- coding: utf-8 -*-
"""CityAir RAG Assistant — Hugging Face Space (Gradio).

Retrieval : BM25 over the CityAir knowledge base (bundled + refreshed from the dataset repo)
Generation: Hugging Face Inference Providers (needs a Space secret HF_TOKEN with the
            "Make calls to Inference Providers" permission)
Fallback  : retrieval-only answer (never invents content)
"""
import json
import math
import os
import re
import threading

import gradio as gr
import requests

DATASET_ID = "sosa123454321/amqx-cityair-kb"
KB_FILE = "amqx_cityair_kb.jsonl"
HF_TOKEN = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN") or ""
MODEL = os.environ.get("CITYAIR_MODEL", "Qwen/Qwen2.5-7B-Instruct")
SITE = "https://aqmx.atikova.com"

STOP = set(
    """a an the and or of in on for to from with without into over under is are was were be been being
    do does did doing have has had having how what when where which who whom why can could should would
    may might will shall i you he she it we they them their our your my me this that these those there
    here about as at by if then than so not no yes its also more most less least very much many any some
    all each other such only own same too please tell give show explain want need help""".split()
)


def tokenize(text: str):
    text = re.sub(r"[^\w\s.\-]", " ", text.lower())
    return [t.strip(".-") for t in text.split() if len(t.strip(".-")) > 1 and t not in STOP]


def load_kb():
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), KB_FILE)
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            return [json.loads(line) for line in fh if line.strip()]
    url = f"https://huggingface.co/datasets/{DATASET_ID}/resolve/main/{KB_FILE}"
    headers = {"Authorization": f"Bearer {HF_TOKEN}"} if HF_TOKEN else {}
    res = requests.get(url, headers=headers, timeout=30)
    res.raise_for_status()
    return [json.loads(line) for line in res.text.splitlines() if line.strip()]


CHUNKS = load_kb()


def build_index(chunks):
    df, tf, lens = {}, [], []
    for chunk in chunks:
        tokens = tokenize(f"{chunk['title']} {chunk['title']} {chunk['text']} {' '.join(chunk['tags'])}")
        counts = {}
        for token in tokens:
            counts[token] = counts.get(token, 0) + 1
        tf.append(counts)
        lens.append(len(tokens))
        for token in counts:
            df[token] = df.get(token, 0) + 1
    return {"df": df, "tf": tf, "lens": lens, "avg": (sum(lens) / max(1, len(lens)))}


INDEX = build_index(CHUNKS)


def search(query, k=6):
    q = tokenize(query)
    n = len(CHUNKS)
    k1, b = 1.5, 0.75
    scored = []
    for i, chunk in enumerate(CHUNKS):
        counts, score = INDEX["tf"][i], 0.0
        for term in q:
            f = counts.get(term)
            if not f:
                continue
            df = INDEX["df"].get(term, 0)
            idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
            score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * INDEX["lens"][i] / INDEX["avg"])))
        for tag in chunk["tags"]:
            if tag in q:
                score += 1.2
        if score > 0:
            scored.append((chunk, score))
    scored.sort(key=lambda pair: -pair[1])
    return scored[:k]


SYSTEM = (
    "You are the CityAir assistant for city air-quality teams. Answer ONLY from the context "
    "passages. Cite them as [1], [2]. Never certify, rank or approve a city. Never claim official "
    "status: CityAir is an independent prototype and is not an official AQMx, CCAC, WRI, NASA, "
    "XPRIZE or WHO product. Illustrative city data is synthetic and must be labelled as such. "
    "For medical, legal, procurement or compliance questions, state the limit and say what must be "
    "verified locally. Keep answers under 220 words."
)


def ask_hf(question, context):
    if not HF_TOKEN:
        return None
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"CONTEXT:\n\n{context}\n\nQUESTION: {question}"},
        ],
        "max_tokens": 700,
        "temperature": 0.2,
    }
    try:
        res = requests.post(
            "https://router.huggingface.co/v1/chat/completions",
            headers={"Authorization": f"Bearer {HF_TOKEN}", "Content-Type": "application/json"},
            json=payload,
            timeout=60,
        )
        if res.status_code != 200:
            return None
        return res.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def live_reading(city):
    try:
        geo = requests.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": city, "count": 1, "language": "en", "format": "json"},
            timeout=20,
        ).json()
        hit = (geo.get("results") or [None])[0]
        if not hit:
            return None
        air = requests.get(
            "https://air-quality-api.open-meteo.com/v1/air-quality",
            params={
                "latitude": hit["latitude"],
                "longitude": hit["longitude"],
                "current": "pm10,pm2_5,european_aqi,us_aqi",
                "timezone": "UTC",
            },
            timeout=20,
        ).json().get("current", {})
        return f"{hit['name']}: EAQI {air.get('european_aqi', '—')} · PM2.5 {air.get('pm2_5', '—')} µg/m³ · PM10 {air.get('pm10', '—')} µg/m³"
    except Exception:
        return None


def answer(question, city_hint, history):
    question = (question or "").strip()
    if not question:
        return "", history or []
    hits = search(f"{question} {city_hint or ''}")
    if not hits:
        hits = search(question, 4)
    context = "\n\n".join(
        f"[{i + 1}] {chunk['title']} (source: {chunk['source']})\n{chunk['text']}"
        for i, (chunk, _) in enumerate(hits)
    )
    text = ask_hf(question, context)
    provider = f"huggingface:{MODEL}"
    if not text:
        provider = "retrieval-only (no model available)"
        text = (
            "The language model is unavailable, so here are the closest knowledge-base passages:\n\n"
            + "\n\n".join(f"[{i + 1}] {c['title']} — {c['text']}" for i, (c, _) in enumerate(hits[:3]))
        )

    live = live_reading(city_hint) if city_hint else None
    prefix = f"**Live reading** — {live}\n\n" if live else ""
    sources = "\n".join(f"- {c['title']} · {c['source']}" for c, _ in hits[:5])
    reply = f"{prefix}{text}\n\n---\n**Sources consulted**\n{sources}\n\n_via {provider}_"

    history = list(history or [])
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": reply})
    return "", history


DESCRIPTION = f"""
### CityAir — air-quality readiness assistant

Ask about the twelve capacity domains, the scoring and confidence method, the phased action plan,
the innovation library or the illustrative city profiles. Answers are retrieved from the open
[CityAir knowledge base](https://huggingface.co/datasets/{DATASET_ID}) ({len(CHUNKS)} chunks) and
cite what they used.

Full platform (assessment, dashboards, city explorer): **{SITE}**

_CityAir is an independent prototype — not an official AQMx, CCAC, WRI, NASA, XPRIZE or WHO
product. Demonstration city data is illustrative._
"""

with gr.Blocks(title="CityAir RAG Assistant", theme=gr.themes.Soft()) as demo:
    gr.Markdown(DESCRIPTION)
    chatbot = gr.Chatbot(type="messages", height=460, label="CityAir assistant")
    with gr.Row():
        question = gr.Textbox(
            label="Your question",
            placeholder="How is the readiness score calculated?",
            scale=4,
        )
        city = gr.Textbox(label="City for a live reading (optional)", placeholder="Istanbul", scale=1)
    with gr.Row():
        submit = gr.Button("Ask", variant="primary")
        clear = gr.Button("Clear")
    gr.Examples(
        [
            ["How is the readiness score calculated?", "Istanbul"],
            ["What does evidence confidence mean?", ""],
            ["Which innovations address open waste burning?", ""],
            ["What are the five maturity stages?", ""],
            ["How do I start an assessment?", ""],
            ["What data does the Methane and Landfill Monitoring domain need?", ""],
        ],
        inputs=[question, city],
    )
    submit.click(answer, [question, city, chatbot], [question, chatbot])
    question.submit(answer, [question, city, chatbot], [question, chatbot])
    clear.click(lambda: ([], ""), None, [chatbot, question])

if __name__ == "__main__":
    demo.queue().launch(server_name="0.0.0.0", server_port=7860)
