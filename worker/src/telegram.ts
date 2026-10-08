import { aqiBand, formatReading, geocode, airQuality, type Reading } from "./aq";
import { answerQuestion } from "./ai";
import type { Env } from "./types";

type Update = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number; type: string; first_name?: string; username?: string };
    text?: string;
  };
  callback_query?: unknown;
};

const HELP = `*CityAir air tracker* 🌍

/aqi <city> — current PM₂.₅, PM₁₀ and European AQI
/city <name> — readiness profile context for a city
/ask <question> — ask the CityAir knowledge base
/subscribe <city> — daily air-quality digest (needs the alert database)
/unsubscribe — stop the digest
/help — this message
/about — what CityAir is and is not

Examples:
/aqi Istanbul
/aqi Tehran
/ask how is the readiness score calculated?

_Readings are model-based from the Open-Meteo air-quality API, not quality-assured regulatory measurements._`;

export async function sendMessage(
  env: Env,
  chatId: number,
  text: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      ...extra,
    }),
  });
}

async function setWebhook(env: Env, url: string, secret: string): Promise<unknown> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
    }),
  });
  return res.json();
}

export async function handleSetup(
  env: Env,
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? request.headers.get("x-admin-key");
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), { status: 401 });
  }
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response(
      JSON.stringify({ ok: false, error: "TELEGRAM_BOT_TOKEN / TELEGRAM_WEBHOOK_SECRET not configured" }),
      { status: 400 },
    );
  }
  const hookUrl = `${url.origin}/api/telegram/webhook`;
  const result = await setWebhook(env, hookUrl, env.TELEGRAM_WEBHOOK_SECRET);
  return new Response(JSON.stringify({ ok: true, webhook: hookUrl, telegram: result }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
}

async function addSubscriber(env: Env, chatId: number, city: string): Promise<boolean> {
  if (!env.DB) return false;
  try {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS subscribers (chat_id INTEGER PRIMARY KEY, city TEXT NOT NULL, added_at TEXT NOT NULL)",
    ).run();
    await env.DB.prepare(
      "INSERT INTO subscribers (chat_id, city, added_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(chat_id) DO UPDATE SET city = excluded.city",
    )
      .bind(chatId, city, new Date().toISOString())
      .run();
    return true;
  } catch {
    return false;
  }
}

async function removeSubscriber(env: Env, chatId: number): Promise<boolean> {
  if (!env.DB) return false;
  try {
    await env.DB.prepare("DELETE FROM subscribers WHERE chat_id = ?").bind(chatId).run();
    return true;
  } catch {
    return false;
  }
}

export async function handleUpdate(env: Env, update: Update): Promise<void> {
  const message = update.message;
  if (!message?.text) return;
  const chatId = message.chat.id;
  const text = message.text.trim();
  const [rawCommand, ...rest] = text.split(/\s+/);
  const command = rawCommand.toLowerCase().replace(/@\w+$/, "");
  const argument = rest.join(" ").trim();
  const site = env.SITE_URL ?? "https://aqmx.atikova.com";

  if (command === "/start" || command === "/help") {
    await sendMessage(
      env,
      chatId,
      `${HELP}\n\nPlatform: ${site}`,
    );
    return;
  }

  if (command === "/about") {
    await sendMessage(
      env,
      chatId,
      [
        "*CityAir* is an independent air-quality readiness and innovation-exchange prototype for city teams.",
        "",
        "• Twelve-domain readiness assessment with evidence-confidence scoring",
        "• Illustrative city library and live readings",
        "• Innovation implementation briefs with matching",
        "• AI assistant grounded in the published CityAir knowledge base",
        "",
        "It is *not* an official AQMx, CCAC, WRI, NASA or XPRIZE product, it does not rank or certify cities, and demonstration city data is synthetic.",
        "",
        `Website: ${site}`,
      ].join("\n"),
    );
    return;
  }

  if (command === "/aqi") {
    if (!argument) {
      await sendMessage(env, chatId, "Usage: `/aqi <city>` — for example `/aqi Istanbul`");
      return;
    }
    const place = await geocode(argument);
    if (!place) {
      await sendMessage(env, chatId, `I could not find “${argument}”. Try the English city name.`);
      return;
    }
    const reading = await airQuality(place.name, place.latitude, place.longitude, place.country);
    if (!reading) {
      await sendMessage(env, chatId, "The air-quality service is unavailable right now. Try again shortly.");
      return;
    }
    await sendMessage(env, chatId, formatReading(reading, site));
    return;
  }

  if (command === "/city") {
    if (!argument) {
      await sendMessage(env, chatId, "Usage: `/city <name>` — for example `/city Bishkek`");
      return;
    }
    const result = await answerQuestion(env, [
      { role: "user", content: `Give the CityAir readiness profile context for ${argument}: score band, main challenges and the domains that usually need work.` },
    ]);
    await sendMessage(env, chatId, result.answer.slice(0, 3800));
    return;
  }

  if (command === "/ask") {
    if (!argument) {
      await sendMessage(env, chatId, "Usage: `/ask <question>` — for example `/ask how is the readiness score calculated?`");
      return;
    }
    const result = await answerQuestion(env, [{ role: "user", content: argument }]);
    const sources = result.sources.length
      ? `\n\n_Sources: ${result.sources.slice(0, 3).map((s) => s.title).join(" · ")}_`
      : "";
    await sendMessage(env, chatId, `${result.answer.slice(0, 3500)}${sources}`.slice(0, 4000));
    return;
  }

  if (command === "/subscribe") {
    if (!argument) {
      await sendMessage(env, chatId, "Usage: `/subscribe <city>` — for example `/subscribe Kraków`");
      return;
    }
    const ok = await addSubscriber(env, chatId, argument);
    await sendMessage(
      env,
      chatId,
      ok
        ? `Subscribed: a daily air-quality digest for *${argument}*.\nStop any time with /unsubscribe.`
        : "Subscriptions need the alert database (Cloudflare D1), which is not configured on this deployment. The rest of the bot works normally.",
    );
    return;
  }

  if (command === "/unsubscribe") {
    const ok = await removeSubscriber(env, chatId);
    await sendMessage(env, chatId, ok ? "You are unsubscribed." : "No subscription database on this deployment.");
    return;
  }

  // Free text: treat as a knowledge-base question, adding live data when a city is named.
  const place = await geocode(text.slice(0, 60));
  let prefix = "";
  if (place && text.split(/\s+/).length <= 4) {
    const reading: Reading | null = await airQuality(place.name, place.latitude, place.longitude, place.country);
    if (reading) {
      const band = aqiBand(reading.europeanAqi);
      prefix = `${band.emoji} ${reading.city}: European AQI ${reading.europeanAqi ?? "—"} (${band.label}) · PM₂.₅ ${reading.pm25 ?? "—"} µg/m³\n\n`;
    }
  }
  const result = await answerQuestion(env, [{ role: "user", content: text }]);
  await sendMessage(env, chatId, `${prefix}${result.answer}`.slice(0, 4000));
}

export async function handleWebhook(
  env: Env,
  request: Request,
  ctx?: ExecutionContext,
): Promise<Response> {
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (env.TELEGRAM_WEBHOOK_SECRET && secret !== env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("forbidden", { status: 403 });
  }

  const update = (await request.json()) as Update;

  // Telegram expects a fast 200; the reply work continues in the background.
  if (ctx?.waitUntil) {
    ctx.waitUntil(handleUpdate(env, update));
    return new Response("ok");
  }
  await handleUpdate(env, update);
  return new Response("ok");
}
