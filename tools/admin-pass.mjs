#!/usr/bin/env node
/**
 * Generates the salted hash for a new admin password.
 *
 *   node tools/admin-pass.mjs "my new long password"        # prints lines to paste into worker/.dev.vars
 *   node tools/admin-pass.mjs "my new long password" --write  # writes worker/.dev.vars directly
 *
 * The password is only used to compute the hash — it is never written to disk,
 * never logged, and never added to the repository.
 */
import { randomBytes, createHash } from "node:crypto";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const [, , password, flag] = process.argv;
if (!password || password.length < 4) {
  console.error("✗ Usage: node tools/admin-pass.mjs \"<password>\" [--write]");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const devVars = join(root, "worker", ".dev.vars");
const salt = randomBytes(16).toString("hex");
const hash = createHash("sha256").update(salt + password).digest("hex");

if (flag === "--write") {
  const existing = existsSync(devVars) ? readFileSync(devVars, "utf8") : "";
  const strip = (text) => text.split("\n").filter((l) => !/^ADMIN_PASSWORD_(SALT|SHA256)=/.test(l.trim())).join("\n");
  const next = `${strip(existing).trimEnd()}\nADMIN_PASSWORD_SALT="${salt}"\nADMIN_PASSWORD_SHA256="${hash}"\n`;
  writeFileSync(devVars, next);
  console.log("✓ worker/.dev.vars updated (the password itself was not stored)");
} else {
  console.log('ADMIN_PASSWORD_SALT="' + salt + '"');
  console.log('ADMIN_PASSWORD_SHA256="' + hash + '"');
  console.log("\nDeployed: cd worker && npx wrangler secret put ADMIN_PASSWORD_SALT && npx wrangler secret put ADMIN_PASSWORD_SHA256");
}
if (password.length < 12) {
  console.warn("⚠ This password is short. A 4-digit PIN has only 10,000 combinations — fine for a local prototype, risky in public.");
}
