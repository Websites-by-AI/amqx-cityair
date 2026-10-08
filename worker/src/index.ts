import { answerQuestion, kbStats } from "./ai";
import { readingForCity, subscribers } from "./aq";
import { handleAdmin } from "./admin";
import { hfFetchKb, hfStatus } from "./hf";
import { handleSetup, handleUpdate, handleWebhook } from "./telegram";
import type { ChatMessage, Env } from "./types";

const VERSION = "1.0.0";
const ALLOWED_ORIGINS = [
  "https://aqmx.atikova.com",
  "https://amqx.atikova.com",
  "https://sosa123454321-amqx-cityair.hf.space",
];

function cors(origin: string | null): Record<string, string> {
  const allow =
    !origin || ALLOWED_ORIGINS.includes(origin) || origin.includes("localhost")
      ? origin ?? "*"
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (data: unknown, init: ResponseInit = {}, origin: string | null = null) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cors(origin),
      ...(init.headers ?? {}),
    },
  });

async function rateLimit(env: Env, ip: string): Promise<boolean> {
  if (!env.AMQX_KV) return true; // not configured -> unlimited
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`;
  const used = Number((await env.AMQX_KV.get(key)) ?? 0);
  if (used >= 60) return false;
  await env.AMQX_KV.put(key, String(used + 1), { expirationTtl: 3600 });
  return true;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");

    // Admin API is same-origin only: no CORS pre-flight handling for it at all.
    if (url.pathname.startsWith("/api/admin/")) {
      return handleAdmin(request, env, url.pathname);
    }

    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

    // ---------------------------------------------------------------- health
    if (url.pathname === "/api/health") {
      const hook = env.TELEGRAM_BOT_TOKEN
        ? await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`)
            .then((r) => r.json() as Promise<{ result?: { url?: string } }>)
            .catch(() => null)
        : null;
      return json(
        {
          ok: true,
          service: "amqx-cityair-api",
          version: VERSION,
          kbVersion: env.KB_VERSION ?? "1.0.0",
          kbChunks: kbStats().chunks,
          providers: {
            cloudflareAi: Boolean(env.AI),
            huggingFace: Boolean(env.HF_TOKEN),
            kb: true,
            embeddings: Boolean(env.AI),
          },
          storage: { kv: Boolean(env.AMQX_KV), d1: Boolean(env.DB) },
          huggingFace: {
        token: Boolean(env.HF_TOKEN),
        model: env.HF_MODEL ?? "Qwen/Qwen2.5-7B-Instruct",
        dataset: env.HF_DATASET ?? "sosa123454321/amqx-cityair-kb",
        space: env.HF_SPACE ?? "sosa123454321/amqx-cityair",
        statusEndpoint: "/api/hf/status",
      },
      admin: {
        configured: Boolean(env.ADMIN_PASSWORD_SHA256 && env.ADMIN_PASSWORD_SALT),
        name: env.ADMIN_NAME ?? "ann",
        storage: env.AMQX_KV ? "kv" : "memory",
        endpoint: "/api/admin/login",
      },
      telegram: {
            configured: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET),
            username: env.BOT_USERNAME ?? null,
            webhook: hook?.result?.url ?? null,
            subscribers: await subscribers(env),
          },
          time: new Date().toISOString(),
        },
        {},
        origin,
      );
    }

    // ---------------------------------------------------------------- chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      const ip = request.headers.get("cf-connecting-ip") ?? "anonymous";
      if (!(await rateLimit(env, ip))) {
        return json({ error: "Rate limit reached — try again later." }, { status: 429 }, origin);
      }
      let body: { messages?: ChatMessage[]; context?: Record<string, unknown> };
      try {
        body = (await request.json()) as typeof body;
      } catch {
        return json({ error: "Invalid JSON body" }, { status: 400 }, origin);
      }
      const messages = (body.messages ?? []).filter(
        (m) => typeof m?.content === "string" && m.content.trim().length > 0,
      );
      if (!messages.length) return json({ error: "No messages provided" }, { status: 400 }, origin);

      const result = await answerQuestion(env, messages.slice(-10), body.context);
      return json(
        {
          answer: result.answer,
          provider: result.provider,
          kbSource: result.kbSource ?? "bundled",
          sources: result.sources,
          retrieved: result.retrieved.map((hit) => ({ id: hit.chunk.id, score: Math.round(hit.score * 100) / 100 })),
          disclaimer:
            "Generated from the CityAir knowledge base by an LLM (or returned as retrievals when no model is available). Verify decision-critical details against the cited source.",
        },
        {},
        origin,
      );
    }

    // ---------------------------------------------------------------- live air quality
    if (url.pathname === "/api/aqi" && request.method === "GET") {
      const city = url.searchParams.get("city");
      if (!city) return json({ error: "Provide ?city=<name>" }, { status: 400 }, origin);
      const reading = await readingForCity(city);
      if (!reading) return json({ error: "City not found or service unavailable" }, { status: 404 }, origin);
      return json(reading, { headers: { "Cache-Control": "public, max-age=600" } }, origin);
    }

    // ---------------------------------------------------------------- kb stats
    // ---------------------------------------------------------------- hugging face
    if (url.pathname === "/api/hf/status" && request.method === "GET") {
      const probe = url.searchParams.get("probe") === "1";
      const status = await hfStatus(env, probe);
      return json(
        {
          ok: true,
          provider: "huggingface",
          space: env.HF_SPACE ?? "sosa123454321/amqx-cityair",
          ...status,
          howTo: {
            inference:
              "Create a token with the «Make calls to Inference Providers» permission and set it as HF_TOKEN, then the assistant uses that model.",
            dataset: "The knowledge base is published with tools/build-hf-space.mjs.",
          },
        },
        { headers: { "Cache-Control": "no-store" } },
        origin,
      );
    }

    // Pull the knowledge base from the Hugging Face dataset into KV, so the
    // deployed assistant can follow the dataset without a redeploy.
    if (url.pathname === "/api/hf/kb" && request.method === "GET") {
      const checkOnly = url.searchParams.get("check") === "1";
      const { result, chunks } = await hfFetchKb(env);
      if (!result.ok) return json({ ...result, ok: false }, { status: 502 }, origin);
      if (!checkOnly && env.AMQX_KV && chunks.length) {
        await env.AMQX_KV.put("kb:hf", JSON.stringify(chunks));
      }
      const bundled = kbStats().chunks;
      return json(
        {
          ...result,
          ok: true,
          bundled,
          stored: Boolean(!checkOnly && env.AMQX_KV && chunks.length),
          storage: env.AMQX_KV ? "kv" : "memory-unavailable",
          matchesBundle: result.chunks === bundled,
          tryIt: "/api/chat now answers from the Hugging Face copy when KV holds one.",
        },
        { headers: { "Cache-Control": "no-store" } },
        origin,
      );
    }

    if (url.pathname === "/api/kb" && request.method === "GET") {
      return json(kbStats(), { headers: { "Cache-Control": "public, max-age=3600" } }, origin);
    }

    // ---------------------------------------------------------------- telegram
    if (url.pathname === "/api/telegram/webhook" && request.method === "POST") {
      return handleWebhook(env, request, ctx);
    }
    if (url.pathname === "/api/telegram/setup" && request.method === "POST") {
      return handleSetup(env, request);
    }

    // ---------------------------------------------------------------- unknown API route
    if (url.pathname.startsWith("/api/")) {
      return json(
        {
          error: "Unknown API route",
          available: [
            "GET  /api/health",
            "GET  /api/kb",
            "GET  /api/aqi?city=",
            "POST /api/chat",
            "POST /api/telegram/webhook",
            "POST /api/telegram/setup?key=",
          ],
        },
        { status: 404 },
        origin,
      );
    }

    // ---------------------------------------------------------------- static site
    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) return asset;
      // SPA fallback for client-side routes such as /cities/istanbul
      const index = await env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
      return new Response(index.body, {
        status: 200,
        headers: { ...Object.fromEntries(index.headers), "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return json({ error: "Not found" }, { status: 404 }, origin);
  },

  /** Daily air-quality digest for subscribers (see wrangler.jsonc triggers). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const db = env.DB;
    if (!db || !env.TELEGRAM_BOT_TOKEN) return;
    ctx.waitUntil(
      (async () => {
        try {
          const rows = await db.prepare("SELECT chat_id, city FROM subscribers").all<{
            chat_id: number;
            city: string;
          }>();
          for (const row of rows.results ?? []) {
            const reading = await readingForCity(row.city);
            if (!reading) continue;
            await handleUpdate(env, {
              update_id: 0,
              message: {
                message_id: 0,
                chat: { id: row.chat_id, type: "private" },
                text: `/aqi ${row.city}`,
              },
            });
          }
        } catch {
          /* scheduled job is best-effort */
        }
      })(),
    );
  },
};
