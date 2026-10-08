import type { ChatMessage, LiveReading } from "./types";

/**
 * API base resolution order:
 *  1. window.AMQX_API (set by a host page, e.g. the Hugging Face mirror)
 *  2. VITE_API_BASE at build time
 *  3. "" -> same origin /api/* (Cloudflare Worker + static assets deployment)
 */
declare global {
  interface Window {
    AMQX_API?: string;
  }
}

export const API_BASE: string =
  (typeof window !== "undefined" && window.AMQX_API) ||
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "";

export const apiUrl = (path: string) => `${API_BASE}${path}`;

export type Health = {
  ok: boolean;
  service: string;
  version: string;
  kbChunks: number;
  providers: { cloudflareAi: boolean; huggingFace: boolean; kb: boolean };
  telegram: { configured: boolean; webhook: string | null; username: string | null };
  time: string;
};

export async function getHealth(signal?: AbortSignal): Promise<Health | null> {
  try {
    const res = await fetch(apiUrl("/api/health"), { signal });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}

export type ChatResponse = {
  answer: string;
  provider: string;
  sources: { id: string; title: string; source: string }[];
  usage?: { promptTokens?: number; completionTokens?: number };
};

export async function askAssistant(
  messages: ChatMessage[],
  context?: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ChatResponse> {
  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      context,
    }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Assistant error ${res.status}: ${detail.slice(0, 240)}`);
  }
  return (await res.json()) as ChatResponse;
}

const LIVE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Live air quality from Open-Meteo (no API key required, cached for 10 minutes). */
export async function getLiveReading(
  city: string,
  lat: number,
  lon: number,
  signal?: AbortSignal,
): Promise<LiveReading | null> {
  const cacheKey = `cityair-aqi:${city}:${lat}:${lon}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const { at, reading } = JSON.parse(cached) as { at: number; reading: LiveReading };
      if (Date.now() - at < LIVE_TTL_MS) return reading;
    }
  } catch {
    /* storage unavailable */
  }

  try {
    const url =
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
      `&current=pm10,pm2_5,european_aqi,us_aqi&timezone=UTC`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: {
        time?: string;
        pm10?: number;
        pm2_5?: number;
        european_aqi?: number;
        us_aqi?: number;
      };
    };
    const c = data.current ?? {};
    const reading: LiveReading = {
      city,
      latitude: lat,
      longitude: lon,
      pm25: c.pm2_5 ?? null,
      pm10: c.pm10 ?? null,
      europeanAqi: c.european_aqi ?? null,
      usAqi: c.us_aqi ?? null,
      time: c.time ?? null,
    };
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), reading }));
    } catch {
      /* ignore quota errors */
    }
    return reading;
  } catch {
    return null;
  }
}

export function aqiBand(aqi: number | null): { label: string; tone: string } {
  if (aqi === null) return { label: "No data", tone: "bg-slate-100 text-slate-600" };
  if (aqi <= 20) return { label: "Good", tone: "bg-leaf-100 text-leaf-800" };
  if (aqi <= 40) return { label: "Fair", tone: "bg-sun-100 text-sun-800" };
  if (aqi <= 60) return { label: "Moderate", tone: "bg-orange-100 text-orange-800" };
  if (aqi <= 80) return { label: "Poor", tone: "bg-rose-100 text-rose-800" };
  if (aqi <= 100) return { label: "Very poor", tone: "bg-rose-200 text-rose-900" };
  return { label: "Extremely poor", tone: "bg-purple-200 text-purple-900" };
}
