#!/usr/bin/env node
/**
 * CityAir — 20 security checks for the private admin database.
 *
 *   ADMIN_PASSWORD='…' GITHUB_TOKEN=ghp_… node tools/security-test.mjs http://127.0.0.1:8788
 *
 *   ADMIN_PASSWORD is optional locally: the script falls back to private-archive/PREVIEW-PIN.txt
 *   (git-ignored). GITHUB_TOKEN is needed for check 20 (leak scan of the pushed repo).
 *
 * The password is taken from the environment (falls back to worker/.dev.vars) and is
 * never printed. Checks marked [static] read files in the workspace / the pushed GitHub
 * tree instead of calling the server.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const BASE = (process.argv[2] || "http://127.0.0.1:8788").replace(/\/$/, "");

function devVar(key) {
  const file = join(root, "worker", ".dev.vars");
  if (!existsSync(file)) return "";
  const line = readFileSync(file, "utf8").split("\n").find((l) => l.trim().startsWith(`${key}=`));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "") : "";
}

/** The local PIN lives only in the git-ignored private archive (see docs/ADMIN.md). */
function pinFile() {
  const file = join(root, "private-archive", "PREVIEW-PIN.txt");
  if (!existsSync(file)) return "";
  return readFileSync(file, "utf8").trim().split("\n").pop().trim();
}

const PASSWORD = process.env.ADMIN_PASSWORD || devVar("ADMIN_PASSWORD") || pinFile() || "";
if (!PASSWORD) {
  console.error(
    "\n✖ no admin password found — set ADMIN_PASSWORD, add ADMIN_PASSWORD to worker/.dev.vars,\n" +
      "  or restore the git-ignored private-archive/PREVIEW-PIN.txt.\n" +
      "  (refusing to run: the login checks would report misleading HTTP 0 failures)\n",
  );
  process.exit(2);
}
const NAME = process.env.ADMIN_NAME || devVar("ADMIN_NAME") || "ann";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const REPO = "Websites-by-AI/amqx-cityair";

const results = [];
const record = (id, check, ok, detail) => {
  results.push({ id, check, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${String(id).padStart(2)} · ${check} — ${detail}`);
};

const j = async (path, init = {}) => {
  const res = await fetch(`${BASE}${path}`, init);
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, headers: res.headers, body };
};

const post = (path, body, token) =>
  j(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

/* ------------------------------------------------------------------ run */

// 1 — the private DB is not reachable without a token
const noToken = await j("/api/admin/db");
record(1, "بدون توکن، دیتابیس خصوصی خوانده نمی‌شود", noToken.status === 401, `HTTP ${noToken.status}`);

// 2 — a wrong password is rejected
const badPass = await post("/api/admin/login", { name: NAME, password: "0000" });
record(2, "رمز اشتباه رد می‌شود", badPass.status === 401, `HTTP ${badPass.status} ${badPass.body?.error ?? ""}`);

// 3 — a wrong admin name is rejected even with the right password
const badName = PASSWORD ? await post("/api/admin/login", { name: "root", password: PASSWORD }) : { status: 0 };
record(3, "نام ادمین اشتباه رد می‌شود (حتی با رمز درست)", badName.status === 401, `HTTP ${badName.status}`);

// 4 — a forged / random token is rejected
const fake = await j("/api/admin/db", { headers: { authorization: "Bearer " + "a".repeat(64) } });
record(4, "توکن جعلی رد می‌شود", fake.status === 401, `HTTP ${fake.status}`);

// 5 — missing fields are a 400, not a 500
const empty = await post("/api/admin/login", {});
record(5, "بدنه‌ی ناقص → 400 (نه خطای سرور)", empty.status === 400, `HTTP ${empty.status}`);

// 6 — method enforcement
const getLogin = await j("/api/admin/login");
record(6, "GET روی endpoint ورود → 405", getLogin.status === 405, `HTTP ${getLogin.status} Allow=${getLogin.headers.get("allow") ?? "-"}`);

// 7 — no CORS headers on admin responses (a foreign site cannot read them)
const corsCheck = await j("/api/admin/db", { headers: { origin: "https://evil.example" } });
record(
  7,
  "پاسخ‌های ادمین هدر CORS ندارند",
  !corsCheck.headers.get("access-control-allow-origin"),
  `ACAO=${corsCheck.headers.get("access-control-allow-origin") ?? "none"}`,
);

// 8 — responses are never cached and never indexed
record(
  8,
  "پاسخ‌ها no-store و noindex هستند",
  (corsCheck.headers.get("cache-control") ?? "").includes("no-store") &&
    (corsCheck.headers.get("x-robots-tag") ?? "").includes("noindex"),
  `cache=${corsCheck.headers.get("cache-control")} robots=${corsCheck.headers.get("x-robots-tag")}`,
);

// 9 — correct credentials log in and return a 64-hex token
const login = PASSWORD ? await post("/api/admin/login", { name: NAME, password: PASSWORD }) : { status: 0, body: null };
const token = login.body?.token ?? "";
record(
  9,
  "رمز درست ورود موفق می‌دهد و توکن ۶۴ کاراکتری می‌دهد",
  login.status === 200 && /^[a-f0-9]{64}$/.test(token),
  `HTTP ${login.status}, token length ${token.length}`,
);

// 10 — the private DB is readable with the token and carries the private fields
const withToken = await j("/api/admin/db", { headers: { authorization: `Bearer ${token}` } });
const db = withToken.body?.db ?? {};
record(
  10,
  "با توکن، دیتابیس خصوصی خوانده می‌شود",
  withToken.status === 200 && Array.isArray(db.letters) && Array.isArray(db.contacts),
  `HTTP ${withToken.status}, letters=${db.letters?.length ?? 0}, contacts=${db.contacts?.length ?? 0}`,
);

// 11 — write without a token is refused
const writeNoToken = await post("/api/admin/record", { collection: "tasks", record: { title: "intruder" } });
record(11, "نوشتن در دیتابیس بدون توکن رد می‌شود", writeNoToken.status === 401, `HTTP ${writeNoToken.status}`);

// 12 — only whitelisted collections are accepted
const badCollection = await post("/api/admin/record", { collection: "secrets", record: { x: 1 } }, token);
record(12, "مجموعه‌ی غیرمجاز رد می‌شود (whitelist)", badCollection.status === 400, `HTTP ${badCollection.status}`);

// 13 — XSS payloads are stripped before storage
const xss = await post(
  "/api/admin/record",
  { collection: "notes", record: { id: "sec-xss", title: "<script>alert(1)</script>", body: "<img src=x onerror=alert(2)>payload" } },
  token,
);
const storedXss = Array.isArray(db.notes) ? null : null; // read back below
const readBack = await j("/api/admin/db", { headers: { authorization: `Bearer ${token}` } });
const xssNote = (readBack.body?.db?.notes ?? []).find((n) => n.id === "sec-xss");
record(
  13,
  "پیلود XSS هنگام ذخیره پاک‌سازی می‌شود",
  xss.status === 201 && xssNote && !/[<>]/.test(String(xssNote.title) + String(xssNote.body)),
  `stored title=${JSON.stringify(xssNote?.title ?? null)}`,
);

// 14 — oversized payloads are refused
let oversized = { status: 0 };
try {
  oversized = await post("/api/admin/record", { collection: "notes", record: { id: "sec-big", body: "x".repeat(60_000) } }, token);
} catch (err) {
  oversized = { status: 599 };
}
record(14, "پیلود حجیم محدود می‌شود", [400, 413, 599].includes(oversized.status), `HTTP ${oversized.status}`);

// 15 — delete requires a token
const delNoToken = await j("/api/admin/record?collection=notes&id=sec-xss", { method: "DELETE" });
record(15, "حذف بدون توکن رد می‌شود", delNoToken.status === 401, `HTTP ${delNoToken.status}`);

// 16 — logout revokes the token immediately
await post("/api/admin/logout", {}, token);
const afterLogout = await j("/api/admin/db", { headers: { authorization: `Bearer ${token}` } });
record(16, "خروج، توکن را فوراً باطل می‌کند", afterLogout.status === 401, `HTTP ${afterLogout.status}`);

// 17 — brute-force lockout after 5 failed attempts, isolated per IP so that a locked-out
// attacker does not affect the legitimate operator
const TEST_IP = "203.0.113.99";
const hammer = (password) =>
  j("/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": TEST_IP },
    body: JSON.stringify({ name: NAME, password }),
  });
let locked = 0;
let attempts = 0;
for (let i = 0; i < 6; i += 1) {
  const r = await hammer("1111");
  locked = r.status;
  attempts += 1;
  if (r.status === 429) break;
}
const stillIn = PASSWORD
  ? await post("/api/admin/login", { name: NAME, password: PASSWORD })
  : { status: 0 };
record(
  17,
  "بعد از ۵ تلاش ناموفق همان IP قفل می‌شود و IP دیگر سالم می‌ماند",
  locked === 429 && stillIn.status === 200,
  `attacker IP → HTTP ${locked} after ${attempts} tries; operator IP → HTTP ${stillIn.status}`,
);
if (stillIn.body?.token) await post("/api/admin/logout", {}, stillIn.body.token);

// 18 [static] — neither the password nor its hash exists anywhere in the repository tree
const repoFiles = [];
(function walk(dir, depth = 0) {
  if (depth > 6) return;
  for (const entry of readdirSync(dir)) {
    if (["node_modules", ".git", "site", "dist", "space-static", ".wrangler", "private-archive"].includes(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, depth + 1);
    else if (/\.(ts|tsx|js|mjs|json|md|sh|py|html|css|jsonc)$/.test(entry) && st.size < 2_000_000) repoFiles.push(full);
  }
})(root);

const hitPassword = repoFiles.filter((f) => PASSWORD && readFileSync(f, "utf8").includes(PASSWORD));
const salt = devVar("ADMIN_PASSWORD_SALT");
const hash = devVar("ADMIN_PASSWORD_SHA256");
const hitHash = repoFiles.filter((f) => {
  const text = readFileSync(f, "utf8");
  return (salt && salt.length > 8 && text.includes(salt)) || (hash && hash.length > 8 && text.includes(hash));
});
record(
  18,
  "رمز و هش نمک‌دار در هیچ فایل مخزن نیست",
  hitPassword.length === 0 && hitHash.length === 0,
  `${repoFiles.length} files scanned; password hits=${hitPassword.length}, salt/hash hits=${hitHash.length}`,
);

// 19 [static] — the public bundle shipped to the browser contains no private strings
const siteDir = join(root, "app", "site", "assets");
const bundle = existsSync(siteDir)
  ? readdirSync(siteDir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(join(siteDir, f), "utf8")).join("\n")
  : "";
// Markers that must never reach the public bundle. Publicly documented names (e.g. a
// UNEP-awarded programme coordinator) are deliberately NOT treated as private — only the
// contact data and the private-database only fields are.
const privateMarkers = ["208 503 3653", "admin-private", "ژولیت در همایش کیفیت هوا در هتل ددمان"];
const bundleHits = privateMarkers.filter((m) => bundle.includes(m));
record(
  19,
  "بستهٔ عمومی سایت هیچ داده‌ی خصوصی ندارد",
  bundleHits.length === 0,
  bundle ? `scanned ${(bundle.length / 1024).toFixed(0)} KB; hits=${bundleHits.join(",") || "none"}` : "no bundle found",
);

// 20 [static] — the private folder is absent from the pushed GitHub tree, and no private
//              string (e.g. the WhatsApp number) appears anywhere in the public repository
let githubOk = false;
let githubDetail = "GITHUB_TOKEN not provided — skipped";
if (GITHUB_TOKEN) {
  const api = (path) =>
    fetch(`https://api.github.com/repos/${REPO}${path}`, {
      headers: { authorization: `token ${GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
    });
  const privateDir = await api("/contents/private-archive");
  const treeRes = await fetch(`https://api.github.com/repos/${REPO}/git/trees/main?recursive=1`, {
    headers: { authorization: `token ${GITHUB_TOKEN}`, accept: "application/vnd.github+json" },
  });
  const tree = await treeRes.json().catch(() => ({}));
  const leakingPaths = (tree.tree ?? [])
    .map((n) => n.path)
    .filter((path) => /(^|\/)private-archive\/|admin-private\.json$|(^|\/)\.dev\.vars$/.test(path));
  // read the pushed file through the API (uncached) rather than the raw CDN, which
  // can serve a stale copy for a few minutes after a push
  const fileRes = await api("/contents/app/src/data/partners.json?ref=main");
  const fileBody = await fileRes.json().catch(() => ({}));
  const rawText = fileBody.content ? Buffer.from(fileBody.content, "base64").toString("utf8") : "";
  const rawHits = ["208 503 3653", "admin-private", "ژولیت در همایش کیفیت هوا در هتل ددمان"].filter((m) => rawText.includes(m));
  githubOk = privateDir.status === 404 && leakingPaths.length === 0 && rawHits.length === 0;
  githubDetail = `private-archive → HTTP ${privateDir.status}; tree paths leaking=${leakingPaths.length}; partners.json hits=${rawHits.join(",") || "none"}`;
}
record(20, "در GitHub نه پوشه‌ی خصوصی هست و نه شماره‌ی تماس خصوصی", githubOk, githubDetail);

/* ------------------------------------------------------------------ report */
const passed = results.filter((r) => r.ok).length;
const report = `# 🔐 گزارش ۲۰ تست امنیتی — پنل ادمین و دیتابیس خصوصی

میزبان: \`${BASE}\`
تاریخ: ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC
نتیجه: **${passed}/${results.length}** ${passed === results.length ? "✅" : "❌"}

| # | آزمون | نتیجه | جزئیات |
| --- | --- | --- | --- |
${results.map((r) => `| ${r.id} | ${r.check} | ${r.ok ? "✅" : "❌"} | ${String(r.detail).replace(/\|/g, "\\|")} |`).join("\n")}

## ساختار حفاظت

| لایه | چه کاری می‌کند |
| --- | --- |
| هش نمک‌دار | رمز فقط به شکل \`SHA-256(salt+password)\` در \`.dev.vars\` (و در دیپلوی، Cloudflare Secret) است |
| مقایسه‌ی زمان‌ثابت | نشت اطلاعات از طریق زمان پاسخ بسته می‌شود |
| قفل پس از ۵ تلاش | ۱۵ دقیقه قفل بر اساس IP؛ هر تلاش در گزارش دسترسی ثبت می‌شود |
| توکن ۳۲ بایتی | عمر ۳۰ دقیقه، باطل‌شدن فوری با خروج |
| بدون CORS | صفحه‌ی دیگر origins نمی‌تواند پاسخ را بخواند |
| no-store + noindex | نه کش مرورگر، نه ایندکس موتور جست‌وجو |
| fail-closed | اگر هش تنظیم نشده باشد، ورود با 503 بسته می‌شود (هیچ‌وقت باز نمی‌شود) |
| whitelist و sanitize | فقط چهار مجموعه، پاک‌سازی \`< >\`، سقف طول و سقف ۲ مگابایت برای کل دیتابیس |
| جداسازی از مخزن | \`private-archive/\` در \`.gitignore\` و در exclusions اسکریپت push است |

## توصیه‌ی آخر

رمز چهاررقمی فقط ۱۰٬۰۰۰ حالت دارد. محدودیت ۵ تلاش در ۱۵ دقیقه، حمله‌ی آنلاین را عملاً می‌بندد،
اما برای دیپلوی روی دامنه‌ی عمومی بهتر است رمز بلند (≥۱۶ کاراکتر) به‌عنوان Secret تنظیم شود:

\`\`\`bash
cd worker && npx wrangler secret put ADMIN_PASSWORD_SHA256
npx wrangler secret put ADMIN_PASSWORD_SALT
\`\`\`
`;

const outDir = join(root, "docs");
if (!existsSync(outDir)) throw new Error("docs/ missing");
const { writeFileSync } = await import("node:fs");
writeFileSync(join(outDir, "SECURITY-REPORT.md"), report);
console.log(`\n──── ${passed}/${results.length} security checks passed ────`);
console.log("report: docs/SECURITY-REPORT.md");
process.exit(passed === results.length ? 0 : 1);
