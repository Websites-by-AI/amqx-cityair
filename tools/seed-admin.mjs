#!/usr/bin/env node
/**
 * Seeds the private admin database on a running CityAir server.
 *
 * Usage:
 *   node tools/seed-admin.mjs                                  # http://127.0.0.1:8788
 *   ADMIN_PASSWORD=... node tools/seed-admin.mjs https://aqmx.atikova.com
 *
 * The password is read from the environment (or from worker/.dev.vars) and is
 * NEVER written into this file, the repository or the logs.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const base = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/$/, "");

function fromDevVars(key) {
  const file = join(root, "worker", ".dev.vars");
  if (!existsSync(file)) return "";
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "") : "";
}

const name = process.env.ADMIN_NAME || fromDevVars("ADMIN_NAME") || "ann";
const password = process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_PLAIN || "";

const dbFile = join(root, "private-archive", "admin-private.json");
if (!existsSync(dbFile)) {
  console.error(`✗ private database not found: ${dbFile}`);
  process.exit(1);
}
const db = JSON.parse(readFileSync(dbFile, "utf8"));

if (!password) {
  console.error(
    "✗ No password supplied. Set ADMIN_PASSWORD in the environment (it is never stored in the repo).\n" +
      "  Example:  ADMIN_PASSWORD='…' node tools/seed-admin.mjs",
  );
  process.exit(1);
}

const post = async (path, body, token) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

const login = await post("/api/admin/login", { name, password });
const session = await login.json().catch(() => ({}));
if (!login.ok || !session.token) {
  console.error(`✗ login failed (${login.status}): ${session.error ?? "unknown"}`);
  process.exit(1);
}
console.log(`✓ logged in as ${session.name} (token valid ${session.expiresIn}s)`);

// A single import replaces the whole database, so seeding is idempotent:
// run it twice and the counts stay the same. Extra records are added later
// through POST /api/admin/record (from the admin panel itself).
const imported = await post("/api/admin/import", { db }, session.token);
console.log(`✓ imported private database (HTTP ${imported.status})`);

const check = await fetch(`${base}/api/admin/db`, { headers: { authorization: `Bearer ${session.token}` } });
const stored = await check.json().catch(() => ({}));
const count = (key) => (Array.isArray(stored?.db?.[key]) ? stored.db[key].length : 0);

console.log(
  `✓ database now holds: ${count("letters")} letters · ${count("contacts")} contacts · ${count("tasks")} tasks · ${count("notes")} notes`,
);

await post("/api/admin/logout", {}, session.token);
console.log("✓ logged out");
