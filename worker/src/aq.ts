import type { Env } from "./types";

export type Reading = {
  city: string;
  latitude: number;
  longitude: number;
  country?: string;
  pm25: number | null;
  pm10: number | null;
  europeanAqi: number | null;
  usAqi: number | null;
  time: string | null;
  source: string;
};

export function aqiBand(aqi: number | null): { label: string; emoji: string } {
  if (aqi === null) return { label: "no data", emoji: "❔" };
  if (aqi <= 20) return { label: "good", emoji: "🟢" };
  if (aqi <= 40) return { label: "fair", emoji: "🟡" };
  if (aqi <= 60) return { label: "moderate", emoji: "🟠" };
  if (aqi <= 80) return { label: "poor", emoji: "🔴" };
  if (aqi <= 100) return { label: "very poor", emoji: "🟣" };
  return { label: "extremely poor", emoji: "⚫" };
}

export async function geocode(city: string): Promise<{
  name: string;
  country?: string;
  latitude: number;
  longitude: number;
} | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city,
  )}&count=1&language=en&format=json`;
  try {
    const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      results?: { name: string; country?: string; latitude: number; longitude: number }[];
    };
    const hit = data.results?.[0];
    return hit
      ? { name: hit.name, country: hit.country, latitude: hit.latitude, longitude: hit.longitude }
      : null;
  } catch {
    return null;
  }
}

export async function airQuality(
  city: string,
  latitude: number,
  longitude: number,
  country?: string,
): Promise<Reading | null> {
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
    `&current=pm10,pm2_5,european_aqi,us_aqi&timezone=UTC`;
  try {
    const res = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true } } as RequestInit);
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
    return {
      city,
      country,
      latitude,
      longitude,
      pm25: c.pm2_5 ?? null,
      pm10: c.pm10 ?? null,
      europeanAqi: c.european_aqi ?? null,
      usAqi: c.us_aqi ?? null,
      time: c.time ?? null,
      source: "Open-Meteo air-quality API (model data, not quality-assured measurements)",
    };
  } catch {
    return null;
  }
}

export async function readingForCity(city: string): Promise<Reading | null> {
  const place = await geocode(city);
  if (!place) return null;
  return airQuality(place.name, place.latitude, place.longitude, place.country);
}

export function formatReading(reading: Reading, siteUrl: string): string {
  const band = aqiBand(reading.europeanAqi);
  return [
    `${band.emoji} ${reading.city}${reading.country ? `, ${reading.country}` : ""}`,
    "",
    `European AQI: ${reading.europeanAqi ?? "—"} (${band.label})`,
    `PM₂.₅: ${reading.pm25 ?? "—"} µg/m³`,
    `PM₁₀: ${reading.pm10 ?? "—"} µg/m³`,
    reading.time ? `\nUpdated: ${reading.time} UTC` : "",
    "",
    "_Model-based readings from the Open-Meteo air-quality API — not quality-assured regulatory measurements._",
    `Readiness workflow & method: ${siteUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function subscribers(env: Env): Promise<number> {
  if (!env.DB) return 0;
  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM subscribers").first<{ n: number }>();
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
