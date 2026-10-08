import kbJson from "./kb.json";
import { buildIndex, search, tokenize } from "./retrieval";
import type { ChatMessage, Env, KbChunk, Scored } from "./types";

const KB = kbJson as KbChunk[];
const INDEX = buildIndex(KB);

const SYSTEM = `You are the CityAir assistant, a careful technical assistant for city air-quality teams.

Rules:
1. Answer ONLY from the CONTEXT passages provided. If the context does not contain the answer, say what is missing and point to the most relevant CityAir page (Guidance, Assessment, Results, Action plan, Cities, Innovations, Resources, Methodology).
2. Never claim official status. CityAir is an independent prototype; it is not an official AQMx, CCAC, WRI, NASA, XPRIZE or WHO product.
3. Never certify, rank or approve a city. Illustrative city data in the knowledge base is synthetic and must be labelled as such.
4. Cite passages inline like [1], [2] when you use them.
5. Be concrete and specific: give numbers, steps and thresholds when the context has them.
6. Keep answers under 220 words unless the user asks for detail. Use short paragraphs and, when useful, a dash list.
7. If asked for medical, legal, procurement or compliance advice, state the limit and describe what the city must verify locally.`;

export type AnswerResult = {
  answer: string;
  provider: string;
  sources: { id: string; title: string; source: string }[];
  retrieved: Scored[];
};

function contextBlock(hits: Scored[]): string {
  return hits
    .map(
      (hit, i) =>
        `[${i + 1}] ${hit.chunk.title} (source: ${hit.chunk.source})\n${hit.chunk.text}`,
    )
    .join("\n\n");
}

/** Optional vector rerank using Workers AI embeddings, cached in KV. */
async function vectorRerank(env: Env, query: string, hits: Scored[]): Promise<Scored[]> {
  if (!env.AI || hits.length < 2) return hits;
  try {
    const res = (await env.AI.run("@cf/baai/bge-base-en-v1.5", { text: [query] })) as {
      data?: number[][];
    };
    const queryVector = res.data?.[0];
    if (!queryVector) return hits;

    const cacheKey = `kbvec:${env.KB_VERSION ?? "1"}`;
    let vectors: Record<string, number[]> = {};
    if (env.AMQX_KV) {
      vectors = ((await env.AMQX_KV.get(cacheKey, "json")) as Record<string, number[]>) ?? {};
    }
    const missing = hits.filter((h) => !vectors[h.chunk.id]).map((h) => h.chunk);
    if (missing.length) {
      const embedRes = (await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: missing.map((c) => `${c.title}. ${c.text}`),
      })) as { data?: number[][] };
      const fresh = embedRes.data ?? [];
      missing.forEach((chunk, i) => {
        if (fresh[i]) vectors[chunk.id] = fresh[i];
      });
      if (env.AMQX_KV && Object.keys(vectors).length) {
        await env.AMQX_KV.put(cacheKey, JSON.stringify(vectors), { expirationTtl: 60 * 60 * 24 * 30 });
      }
    }

    const { cosine } = await import("./retrieval");
    return hits
      .map((hit) => {
        const vector = vectors[hit.chunk.id];
        const similarity = vector ? cosine(queryVector, vector) : 0;
        return { ...hit, score: hit.score * 0.55 + similarity * 100 * 0.45 };
      })
      .sort((a, b) => b.score - a.score);
  } catch {
    return hits;
  }
}

async function callWorkersAi(env: Env, messages: ChatMessage[]): Promise<string | null> {
  if (!env.AI) return null;
  try {
    const res = (await env.AI.run(env.AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct", {
      messages,
      max_tokens: 700,
      temperature: 0.2,
    })) as { response?: string };
    return res.response?.trim() || null;
  } catch {
    return null;
  }
}

async function callHuggingFace(env: Env, messages: ChatMessage[]): Promise<string | null> {
  if (!env.HF_TOKEN) return null;
  try {
    const res = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
        messages,
        max_tokens: 700,
        temperature: 0.2,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function extractive(hits: Scored[], query: string): string {
  if (!hits.length) {
    return `I could not find this in the CityAir knowledge base. It covers the twelve guidance domains, the scoring and confidence method, the assessment questions, twenty illustrative city profiles, the innovation library and public resources. Try rephrasing, or open the Guidance and Methodology pages.\n\n(The language model is unavailable, so this is a retrieval-only answer for “${query}”.)`;
  }
  const body = hits
    .slice(0, 3)
    .map((hit, i) => `[${i + 1}] ${hit.chunk.title} — ${hit.chunk.text}`)
    .join("\n\n");
  return `The language model is currently unavailable, so here are the closest knowledge-base passages for “${query}”:\n\n${body}\n\n_Retrieval-only answer. Verify decision-critical details against the cited source._`;
}

export async function answerQuestion(
  env: Env,
  messages: ChatMessage[],
  context?: Record<string, unknown>,
): Promise<AnswerResult> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const cityHint =
    context && typeof context === "object" && context.city && typeof context.city === "object"
      ? String((context.city as { name?: string }).name ?? "")
      : "";
  const query = `${lastUser} ${cityHint}`.trim();

  let hits = search(INDEX, query, 8);
  if (!hits.length) hits = search(INDEX, tokenize(query).slice(0, 3).join(" "), 6);
  hits = await vectorRerank(env, query, hits);
  hits = hits.slice(0, 6);

  const contextText = context
    ? `\nUSER CONTEXT (their own assessment, treat as given):\n${JSON.stringify(context).slice(0, 1500)}`
    : "";

  const prompt: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    ...messages.filter((m) => m.role !== "system").slice(-8),
    {
      role: "system",
      content: `CONTEXT PASSAGES:\n\n${contextBlock(hits)}${contextText}\n\nAnswer using only the context above and cite passages as [1], [2].`,
    },
  ];

  const sources = hits.map((hit) => ({
    id: hit.chunk.id,
    title: hit.chunk.title,
    source: hit.chunk.source,
  }));

  const fromWorkersAi = await callWorkersAi(env, prompt);
  if (fromWorkersAi)
    return {
      answer: fromWorkersAi,
      provider: `cloudflare-workers-ai:${env.AI_MODEL ?? "@cf/meta/llama-3.1-8b-instruct"}`,
      sources,
      retrieved: hits,
    };

  const fromHf = await callHuggingFace(env, prompt);
  if (fromHf)
    return {
      answer: fromHf,
      provider: `huggingface:${env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct"}`,
      sources,
      retrieved: hits,
    };

  return {
    answer: extractive(hits, lastUser.slice(0, 160)),
    provider: "extractive-retrieval",
    sources,
    retrieved: hits,
  };
}

export const kbStats = () => ({
  chunks: KB.length,
  sources: Array.from(new Set(KB.map((c) => c.source))),
});
