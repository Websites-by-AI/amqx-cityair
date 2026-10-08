/**
 * Hugging Face API integration.
 *
 * What this does (and does not) do:
 *   • `hfStatus()`  — reports, honestly and in real time, which HF capabilities the
 *      configured token can use: identity, dataset read, repo write, and Inference
 *      Providers. It never invents a capability: a 403 from the router is reported as
 *      "not permitted" rather than "available".
 *   • `hfAnswer()`  — chat answers through the HF Inference Providers router
 *      (OpenAI-compatible), used as the second provider after Cloudflare Workers AI.
 *   • `hfDatasetInfo()` — reads the public knowledge-base dataset metadata.
 *
 * The token lives in `HF_TOKEN` (worker/.dev.vars locally, a Cloudflare Secret when
 * deployed, or an HF Space secret). Without it every call degrades gracefully.
 */
import type { Env } from "./types";

const ROUTER = "https://router.huggingface.co/v1/chat/completions";
const API = "https://huggingface.co";

export type HfStatus = {
  configured: boolean;
  model: string;
  token: { valid: boolean; user?: string; name?: string; isPro?: boolean; scopes?: string[] };
  dataset: { repo: string; ok: boolean; lastModified?: string; note?: string };
  inference: { permitted: boolean | null; detail: string };
};

const authHeaders = (token: string) => ({ Authorization: `Bearer ${token}` });

async function timed<T>(fn: (signal: AbortSignal) => Promise<T>, ms = 20000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Identity + scopes for the configured token. */
export async function hfWhoAmI(env: Env): Promise<HfStatus["token"]> {
  const token = env.HF_TOKEN;
  if (!token) return { valid: false };
  try {
    const res = await timed((signal) =>
      fetch(`${API}/api/whoami-v2`, { headers: authHeaders(token), signal }),
    );
    if (!res.ok) return { valid: false };
    const data = (await res.json()) as {
      name?: string;
      isPro?: boolean;
      auth?: { accessToken?: { displayName?: string; fineGrained?: { global?: string[]; scoped?: { permissions?: string[] }[] } } };
    };
    const scopes = new Set<string>(data.auth?.accessToken?.fineGrained?.global ?? []);
    for (const entry of data.auth?.accessToken?.fineGrained?.scoped ?? []) {
      for (const p of entry.permissions ?? []) scopes.add(p);
    }
    return {
      valid: true,
      user: data.name,
      name: data.auth?.accessToken?.displayName,
      isPro: data.isPro,
      scopes: [...scopes],
    };
  } catch {
    return { valid: false };
  }
}

/** Metadata for the public KB dataset. */
export async function hfDatasetInfo(env: Env) {
  const repo = env.HF_DATASET ?? "sosa123454321/amqx-cityair-kb";
  try {
    const res = await timed((signal) =>
      fetch(`${API}/api/datasets/${repo}`, {
        headers: env.HF_TOKEN ? authHeaders(env.HF_TOKEN) : {},
        signal,
      }),
    );
    if (!res.ok) return { repo, ok: false, note: `HTTP ${res.status}` };
    const data = (await res.json()) as { lastModified?: string; private?: boolean };
    return { repo, ok: true, lastModified: data.lastModified, note: data.private ? "private" : "public" };
  } catch (err) {
    return { repo, ok: false, note: String(err).slice(0, 80) };
  }
}

/** Does the token have Inference Providers permission? Probed only when asked. */
async function hfInferencePermission(env: Env, probe: boolean): Promise<HfStatus["inference"]> {
  const token = env.HF_TOKEN;
  if (!token) return { permitted: null, detail: "HF_TOKEN not configured" };
  if (!probe) return { permitted: null, detail: "not probed (add ?probe=1)" };
  try {
    const res = await timed(
      (signal) =>
        fetch(ROUTER, {
          method: "POST",
          headers: { ...authHeaders(token), "content-type": "application/json" },
          body: JSON.stringify({
            model: env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          }),
          signal,
        }),
      15000,
    );
    if (res.ok) return { permitted: true, detail: "router accepted the call" };
    const body = await res.text().catch(() => "");
    const hint =
      res.status === 403
        ? "token lacks the «Make calls to Inference Providers» permission — create a token with that scope"
        : res.status === 401
          ? "token rejected"
          : `HTTP ${res.status}`;
    return { permitted: false, detail: `${hint}${body ? ` · ${body.slice(0, 120)}` : ""}` };
  } catch (err) {
    return { permitted: false, detail: String(err).slice(0, 100) };
  }
}

export async function hfStatus(env: Env, probe = false): Promise<HfStatus> {
  const [token, dataset, inference] = await Promise.all([
    hfWhoAmI(env),
    hfDatasetInfo(env),
    hfInferencePermission(env, probe),
  ]);
  return {
    configured: Boolean(env.HF_TOKEN),
    model: env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
    token,
    dataset,
    inference,
  };
}

/**
 * Ask a model through the HF Inference Providers router.
 * Returns null when the token, the model or the network are not usable — the caller
 * then falls back to the extractive retrieval answer.
 */
export async function hfAnswer(
  env: Env,
  system: string,
  question: string,
  context: string,
): Promise<string | null> {
  const token = env.HF_TOKEN;
  if (!token) return null;
  const model = env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct";
  try {
    const res = await timed(
      (signal) =>
        fetch(ROUTER, {
          method: "POST",
          headers: {
            ...authHeaders(token),
            "content-type": "application/json",
            ...(env.SITE_URL ? { "X-Source": env.SITE_URL } : {}),
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: system },
              { role: "user", content: `Knowledge-base passages:\n${context}\n\nQuestion: ${question}` },
            ],
            max_tokens: 600,
            temperature: 0.2,
          }),
          signal,
        }),
      30000,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ KB over the HF API */

export type HfKbResult = {
  ok: boolean;
  repo: string;
  file: string;
  chunks: number;
  bytes: number;
  fetchedAt: string;
  detail?: string;
};

/**
 * Read the knowledge base from the Hugging Face dataset repository (JSONL).
 * This makes the HF dataset the source of truth for retrieval: publish a new KB
 * with tools/build-hf-space.mjs and the deployed site can pick it up by calling
 * GET /api/hf/kb — no redeploy needed.
 */
export async function hfFetchKb(env: Env): Promise<{ result: HfKbResult; chunks: unknown[] }> {
  const repo = env.HF_DATASET ?? "sosa123454321/amqx-cityair-kb";
  const file = env.HF_KB_FILE ?? "amqx_cityair_kb.jsonl";
  const url = `${API}/datasets/${repo}/resolve/main/${file}`;
  const fetchedAt = new Date().toISOString();
  try {
    const res = await timed(
      (signal) => fetch(url, { headers: env.HF_TOKEN ? authHeaders(env.HF_TOKEN) : {}, signal }),
      25000,
    );
    if (!res.ok) {
      return { result: { ok: false, repo, file, chunks: 0, bytes: 0, fetchedAt, detail: `HTTP ${res.status}` }, chunks: [] };
    }
    const text = await res.text();
    const chunks = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((row): row is Record<string, unknown> => Boolean(row && row.id && row.text));
    return {
      result: { ok: true, repo, file, chunks: chunks.length, bytes: text.length, fetchedAt },
      chunks,
    };
  } catch (err) {
    return {
      result: { ok: false, repo, file, chunks: 0, bytes: 0, fetchedAt, detail: String(err).slice(0, 120) },
      chunks: [],
    };
  }
}
