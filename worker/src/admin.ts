/**
 * Admin API — private correspondence database.
 *
 * Design rules (why it is written this way):
 *   • The password never exists in this repository. Only a salted SHA-256 lives in
 *     `worker/.dev.vars` (git-ignored) locally and in a Cloudflare Secret when deployed.
 *     If the hash is not configured, the endpoint fails CLOSED (503) instead of open.
 *   • All private data lives in KV (or per-isolate memory locally). It is never bundled
 *     into the front-end, never written to the repository, never served to the mirror.
 *   • No CORS headers are emitted for /api/admin/*, so a browser page on another origin
 *     cannot read responses even if it somehow obtained a token.
 *   • Every response is `no-store` + `noindex` and carries a Referrer-Policy.
 *   • Brute force: 5 failed attempts per IP / 15 minutes -> 429 with Retry-After.
 *   • Tokens: 32 random bytes, 30-minute TTL, revoked on logout, listed in an access log.
 */
import type { Env } from "./types";

const TOKEN_TTL = 1800;                 // seconds
const MAX_FAILS = 5;                    // per IP per window
const FAIL_WINDOW = 15 * 60;            // seconds
const MAX_DB_BYTES = 2 * 1024 * 1024;   // 2 MB cap on the private database
const MAX_BODY_BYTES = 256 * 1024;      // 256 KB cap on any admin request body
const MAX_FIELD_CHARS = 20000;          // hard cap on a single string field
const COLLECTIONS = ["letters", "contacts", "tasks", "notes"] as const;

/* ------------------------------------------------------------------ storage */

// Local `wrangler dev` without a KV namespace falls back to this in-memory store.
// It is per-isolate, so a restart clears it — re-seed with tools/seed-admin.mjs.
let memoryDb: unknown = null;
let memoryTokens = new Map<string, { name: string; exp: number }>();
let memoryFails = new Map<string, { n: number; until: number }>();
let memoryLog: unknown[] = [];

const hasKv = (env: Env) => Boolean(env.AMQX_KV);

async function dbGet(env: Env): Promise<unknown> {
  if (hasKv(env)) {
    const raw = await env.AMQX_KV!.get("admin:db");
    return raw ? JSON.parse(raw) : null;
  }
  return memoryDb;
}

async function dbPut(env: Env, value: unknown): Promise<void> {
  const raw = JSON.stringify(value);
  if (raw.length > MAX_DB_BYTES) throw new Error("database too large");
  if (hasKv(env)) {
    await env.AMQX_KV!.put("admin:db", raw);
    return;
  }
  memoryDb = value;
}

/* ------------------------------------------------------------------ helpers */

const enc = new TextEncoder();

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison (length is allowed to leak, content is not). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Strip anything that could become markup, collapse whitespace, cap the length. */
function sanitize(value: unknown, max = 20000): string {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .slice(0, max)
    .trim();
}

/** Reject (rather than silently truncate) a field that is longer than allowed. */
function oversizedField(input: unknown, limit = MAX_FIELD_CHARS): string | null {
  if (typeof input === "string") return input.length > limit ? `field exceeds ${limit} characters` : null;
  if (Array.isArray(input)) {
    for (const item of input) {
      const bad = oversizedField(item, limit);
      if (bad) return bad;
    }
    return null;
  }
  if (input && typeof input === "object") {
    for (const value of Object.values(input as Record<string, unknown>)) {
      const bad = oversizedField(value, limit);
      if (bad) return bad;
    }
  }
  return null;
}

/** Read a JSON body with a hard size cap before parsing. */
async function readJson(request: Request): Promise<{ data?: Record<string, unknown>; error?: string; status?: number }> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { error: "Unreadable body", status: 400 };
  }
  if (raw.length > MAX_BODY_BYTES) return { error: "Payload too large", status: 413 };
  if (!raw.trim()) return { error: "Empty body", status: 400 };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== "object" || Array.isArray(data)) return { error: "Invalid JSON body", status: 400 };
    return { data };
  } catch {
    return { error: "Invalid JSON body", status: 400 };
  }
}

function sanitizeRecord(input: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return out;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const cleanKey = sanitize(key, 40).replace(/[^\w.-]/g, "");
    if (!cleanKey) continue;
    if (Array.isArray(value)) {
      out[cleanKey] = value.slice(0, 200).map((v) =>
        typeof v === "object" && v !== null ? sanitizeRecord(v) : sanitize(v, 4000),
      );
    } else if (value && typeof value === "object") {
      out[cleanKey] = sanitizeRecord(value);
    } else if (typeof value === "boolean" || typeof value === "number") {
      out[cleanKey] = value;
    } else {
      out[cleanKey] = sanitize(value, 20000);
    }
  }
  return out;
}

function adminJson(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      // deliberately NO Access-Control-Allow-Origin
      Vary: "Origin",
      ...(init.headers ?? {}),
    },
  });
}

/**
 * Client IP for rate limiting.
 *  • `cf-connecting-ip` is set by Cloudflare and cannot be spoofed by a client.
 *  • Otherwise fall back to the RIGHT-most X-Forwarded-For entry (the closest proxy),
 *    so a caller cannot escape the limit by prefixing fake entries.
 */
function clientIp(request: Request): string {
  const direct = request.headers.get("cf-connecting-ip");
  if (direct && direct.trim()) return direct.trim();
  const chain = request.headers.get("x-forwarded-for");
  if (chain) {
    const parts = chain.split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "local";
}

/* ------------------------------------------------------------------ auth */

async function checkPassword(env: Env, password: string): Promise<{ ok: boolean; configured: boolean }> {
  const salt = env.ADMIN_PASSWORD_SALT;
  const expected = env.ADMIN_PASSWORD_SHA256;
  if (!salt || !expected) return { ok: false, configured: false };
  const given = await sha256Hex(salt + password);
  return { ok: safeEqual(given, expected.toLowerCase()), configured: true };
}

async function bumpFail(env: Env, ip: string): Promise<number> {
  const key = `admin:fail:${ip}`;
  if (hasKv(env)) {
    const raw = await env.AMQX_KV!.get(key);
    const state = raw ? (JSON.parse(raw) as { n: number }) : { n: 0 };
    const n = state.n + 1;
    await env.AMQX_KV!.put(key, JSON.stringify({ n }), { expirationTtl: FAIL_WINDOW });
    return n;
  }
  const state = memoryFails.get(ip) ?? { n: 0, until: Date.now() + FAIL_WINDOW * 1000 };
  state.n += 1;
  memoryFails.set(ip, state);
  return state.n;
}

async function failCount(env: Env, ip: string): Promise<number> {
  if (hasKv(env)) {
    const raw = await env.AMQX_KV!.get(`admin:fail:${ip}`);
    return raw ? ((JSON.parse(raw) as { n: number }).n ?? 0) : 0;
  }
  const state = memoryFails.get(ip);
  if (!state) return 0;
  if (state.until < Date.now()) {
    memoryFails.delete(ip);
    return 0;
  }
  return state.n;
}

async function clearFails(env: Env, ip: string): Promise<void> {
  if (hasKv(env)) {
    await env.AMQX_KV!.delete(`admin:fail:${ip}`);
    return;
  }
  memoryFails.delete(ip);
}

async function issueToken(env: Env, name: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hasKv(env)) {
    await env.AMQX_KV!.put(`admin:tk:${token}`, JSON.stringify({ name }), { expirationTtl: TOKEN_TTL });
  } else {
    memoryTokens.set(token, { name, exp: Date.now() + TOKEN_TTL * 1000 });
  }
  return token;
}

async function readToken(env: Env, token: string): Promise<{ name: string } | null> {
  if (hasKv(env)) {
    const raw = await env.AMQX_KV!.get(`admin:tk:${token}`);
    return raw ? (JSON.parse(raw) as { name: string }) : null;
  }
  const entry = memoryTokens.get(token);
  if (!entry) return null;
  if (entry.exp < Date.now()) {
    memoryTokens.delete(token);
    return null;
  }
  return { name: entry.name };
}

async function revokeToken(env: Env, token: string): Promise<void> {
  if (hasKv(env)) {
    await env.AMQX_KV!.delete(`admin:tk:${token}`);
    return;
  }
  memoryTokens.delete(token);
}

const bearer = (request: Request): string => {
  const auth = request.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
};

async function log(env: Env, entry: Record<string, unknown>): Promise<void> {
  const line = { at: new Date().toISOString(), ...entry };
  if (hasKv(env)) {
    const raw = await env.AMQX_KV!.get("admin:log");
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    list.unshift(line);
    await env.AMQX_KV!.put("admin:log", JSON.stringify(list.slice(0, 100)));
    return;
  }
  memoryLog = [line, ...memoryLog].slice(0, 100);
}

async function readLog(env: Env): Promise<unknown[]> {
  if (hasKv(env)) {
    const raw = await env.AMQX_KV!.get("admin:log");
    return raw ? (JSON.parse(raw) as unknown[]) : [];
  }
  return memoryLog;
}

/* ------------------------------------------------------------------ routes */

export async function handleAdmin(request: Request, env: Env, path: string): Promise<Response> {
  const ip = clientIp(request);
  const method = request.method;

  /* ---------------- login ---------------- */
  if (path === "/api/admin/login") {
    if (method !== "POST") return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });

    if (await failCount(env, ip) >= MAX_FAILS) {
      return adminJson(
        { error: "Too many failed attempts — locked for 15 minutes." },
        { status: 429, headers: { "Retry-After": String(FAIL_WINDOW) } },
      );
    }

    const parsed = await readJson(request);
    if (parsed.error) return adminJson({ error: parsed.error }, { status: parsed.status ?? 400 });
    const body = parsed.data as { name?: string; password?: string };

    const name = sanitize(body.name, 60);
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !password) {
      await log(env, { ip, name, action: "login", result: "missing-fields" });
      return adminJson({ error: "Admin name and password are required" }, { status: 400 });
    }
    if (password.length > 200) {
      await log(env, { ip, name, action: "login", result: "oversized" });
      return adminJson({ error: "Bad credentials" }, { status: 401 });
    }

    const { ok, configured } = await checkPassword(env, password);
    if (!configured) {
      return adminJson(
        { error: "Admin login is not configured on this deployment (fail-closed)." },
        { status: 503 },
      );
    }

    const expectedName = (env.ADMIN_NAME ?? "ann").trim().toLowerCase();
    const nameOk = name.toLowerCase() === expectedName;

    if (!ok || !nameOk) {
      const n = await bumpFail(env, ip);
      await log(env, { ip, name, action: "login", result: "failed", attempt: n });
      const left = Math.max(0, MAX_FAILS - n);
      return adminJson({ error: "Bad credentials", attemptsLeft: left }, { status: 401 });
    }

    await clearFails(env, ip);
    const token = await issueToken(env, expectedName);
    await log(env, { ip, name: expectedName, action: "login", result: "ok", ua: sanitize(request.headers.get("user-agent"), 120) });
    return adminJson({ ok: true, token, name: expectedName, expiresIn: TOKEN_TTL });
  }

  /* ---------------- everything below needs a token ---------------- */
  const token = bearer(request);
  if (!token) {
    return adminJson({ error: "Unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }
  const session = await readToken(env, token);
  if (!session) return adminJson({ error: "Session expired or invalid" }, { status: 401 });

  if (path === "/api/admin/whoami") {
    if (method !== "GET") return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    return adminJson({ ok: true, name: session.name, ttl: TOKEN_TTL });
  }

  if (path === "/api/admin/logout") {
    if (method !== "POST") return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
    await revokeToken(env, token);
    await log(env, { ip, name: session.name, action: "logout", result: "ok" });
    return adminJson({ ok: true });
  }

  if (path === "/api/admin/db" || path === "/api/admin/export") {
    if (method !== "GET") return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    const db = await dbGet(env);
    if (!db) return adminJson({ error: "Private database is empty on this deployment — seed it first." }, { status: 404 });
    await log(env, { ip, name: session.name, action: path.endsWith("export") ? "export" : "read", result: "ok" });
    return adminJson({ ok: true, exportedAt: new Date().toISOString(), db });
  }

  if (path === "/api/admin/log") {
    if (method !== "GET") return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
    return adminJson({ ok: true, entries: await readLog(env) });
  }

  if (path === "/api/admin/import") {
    if (method !== "POST") return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
    const parsed = await readJson(request);
    if (parsed.error) return adminJson({ error: parsed.error }, { status: parsed.status ?? 400 });
    const body = parsed.data as { db?: unknown };
    if (!body.db || typeof body.db !== "object") return adminJson({ error: "db object required" }, { status: 400 });
    const tooBig = oversizedField(body.db);
    if (tooBig) return adminJson({ error: tooBig }, { status: 413 });
    const clean = sanitizeRecord(body.db);
    if (JSON.stringify(clean).length > MAX_DB_BYTES) return adminJson({ error: "Payload too large" }, { status: 413 });
    await dbPut(env, clean);
    await log(env, { ip, name: session.name, action: "import", result: "ok" });
    return adminJson({ ok: true, bytes: JSON.stringify(clean).length });
  }

  if (path === "/api/admin/record") {
    if (method === "POST") {
      const parsed = await readJson(request);
      if (parsed.error) return adminJson({ error: parsed.error }, { status: parsed.status ?? 400 });
      const body = parsed.data as { collection?: string; record?: unknown };
      const tooLong = oversizedField(body.record);
      if (tooLong) return adminJson({ error: tooLong }, { status: 413 });
      const collection = sanitize(body.collection, 20);
      if (!(COLLECTIONS as readonly string[]).includes(collection)) {
        return adminJson({ error: `collection must be one of ${COLLECTIONS.join(", ")}` }, { status: 400 });
      }
      const record = sanitizeRecord(body.record);
      if (!Object.keys(record).length) return adminJson({ error: "Empty record" }, { status: 400 });
      const db = ((await dbGet(env)) ?? {}) as Record<string, unknown>;
      const list = Array.isArray(db[collection]) ? (db[collection] as unknown[]) : [];
      const entry = {
        ...record,
        id: sanitize(record.id, 60) || `${collection}-${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        createdBy: session.name,
      };
      list.unshift(entry);
      db[collection] = list.slice(0, 500);
      try {
        await dbPut(env, db);
      } catch {
        return adminJson({ error: "Database size limit reached" }, { status: 413 });
      }
      await log(env, { ip, name: session.name, action: "add", result: "ok", collection, id: entry.id });
      return adminJson({ ok: true, entry }, { status: 201 });
    }

    if (method === "DELETE") {
      const url = new URL(request.url);
      const collection = sanitize(url.searchParams.get("collection"), 20);
      const id = sanitize(url.searchParams.get("id"), 60);
      if (!(COLLECTIONS as readonly string[]).includes(collection) || !id) {
        return adminJson({ error: "collection and id are required" }, { status: 400 });
      }
      const db = ((await dbGet(env)) ?? {}) as Record<string, unknown>;
      const list = Array.isArray(db[collection]) ? (db[collection] as unknown[]) : [];
      const next = list.filter((item) => sanitize((item as Record<string, unknown>).id, 60) !== id);
      if (next.length === list.length) return adminJson({ error: "Not found" }, { status: 404 });
      db[collection] = next;
      await dbPut(env, db);
      await log(env, { ip, name: session.name, action: "delete", result: "ok", collection, id });
      return adminJson({ ok: true, removed: id });
    }

    return adminJson({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST,DELETE" } });
  }

  return adminJson({ error: "Unknown admin route" }, { status: 404 });
}
