#!/usr/bin/env node
/**
 * Archive coverage audit.
 *
 * Measures how complete the correspondence archive is, per document and overall,
 * and writes:
 *   - coveragePercent  + coverageBreakdown  back into app/src/data/partners.json
 *   - docs/partners/ARCHIVE-COVERAGE.md     (Persian report, ready to read/share)
 *
 * Method (fixed, so the numbers are reproducible):
 *   metadata      20%   date + time + channel + from + to + subject
 *   body          40%   verbatim 100 · translated 95 · private 60 · summary 50 · partial 35 · missing 0
 *   attachments   15%   all 100 · n/a 100 · some 50 · none 0
 *   status        15%   full 100 · partial 50 · missing 0
 *   privacy       10%   labelled 100 · none 0
 *   A document's score is the weighted sum; the overall figure is the mean of the documents.
 *
 * Run:  node tools/archive-coverage.mjs      (before `npm run build`)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dataPath = join(root, "app", "src", "data", "partners.json");
const outPath = join(root, "docs", "partners", "ARCHIVE-COVERAGE.md");

const W = { metadata: 20, body: 40, attachments: 15, status: 15, privacy: 10 };
const V = {
  metadata: { full: 1, partial: 0.5, missing: 0 },
  body: { verbatim: 1, translated: 0.95, private: 0.6, summary: 0.5, partial: 0.35, missing: 0 },
  attachments: { all: 1, "n/a": 1, some: 0.5, none: 0 },
  status: { full: 1, partial: 0.5, missing: 0 },
  privacy: { labelled: 1, none: 0 },
};

const pct = (value) => `${Math.round(value * 1000) / 10}%`;

function scoreRecord(rec) {
  const audit = rec.audit;
  if (!audit) return { percent: null, breakdown: null };
  const breakdown = {};
  let total = 0;
  for (const key of Object.keys(W)) {
    const state = String(audit[key] ?? "missing");
    const value = V[key][state] ?? 0;
    breakdown[key] = { state, points: Math.round(W[key] * value * 10) / 10, max: W[key] };
    total += W[key] * value;
  }
  return { percent: Math.round(total), breakdown };
}

const data = JSON.parse(readFileSync(dataPath, "utf8"));
const records = data.archive ?? [];

for (const rec of records) {
  const { percent, breakdown } = scoreRecord(rec);
  rec.coveragePercent = percent;
  rec.coverageBreakdown = breakdown;
}

const scored = records.filter((r) => typeof r.coveragePercent === "number");
const overall = scored.length ? Math.round(scored.reduce((a, r) => a + r.coveragePercent, 0) / scored.length) : 0;
const complete = scored.filter((r) => r.coveragePercent === 100).length;
const partial = scored.filter((r) => r.coveragePercent < 100).length;
const privateOnly = records.filter((r) => r.audit?.body === "private").length;
const gaps = data.gapRegister ?? [];
const gapsMine = gaps.filter((g) => g.owner === "ما").length;

data.coverageSummary = {
  updated: data.meta?.coverageDate ?? new Date().toISOString().slice(0, 10),
  method: data.meta?.coverageMethod ?? "",
  overallPercent: overall,
  documents: scored.length,
  completeDocuments: complete,
  partialDocuments: partial,
  privateOnlyDocuments: privateOnly,
  gapCount: gaps.length,
  gapsOurs: gapsMine,
  perDocument: scored.map((r) => ({ id: r.id, subject: r.subject, percent: r.coveragePercent })),
};

writeFileSync(dataPath, JSON.stringify(data, null, 2));

/* ---------------------------------------------------------------- report */
const label = {
  metadata: "فراداده",
  body: "متن پیام",
  attachments: "پیوست‌ها/لینک‌ها",
  status: "وضعیت و قدم بعدی",
  privacy: "برچسب حریم خصوصی",
};
const stateFa = {
  full: "کامل", partial: "ناقص", missing: "ناموجود",
  verbatim: "واژه‌به‌واژه", translated: "ترجمه‌شده", private: "خصوصی (ذخیره‌شده، منتشرنشده)",
  summary: "خلاصه", all: "همه", "n/a": "ندارد", some: "بخشی", none: "هیچ",
  labelled: "دارد",
};
const dirFa = { incoming: "دریافتی", outgoing: "خروجی", internal: "یادداشت داخلی", "in person": "ملاقات حضوری" };

let md = `# 📊 پوشش بایگانی مکاتبات — ${data.coverageSummary.updated}

> **${overall}%** از اسناد مکاتبات، کامل آرشیو شده‌اند.
> ${scored.length} سند · ${complete} سند ۱۰۰٪ · ${partial} سند با شکاف · ${privateOnly} سند که متنش فقط در بایگانی خصوصی است.
> ${gaps.length} شکاف ثبت‌شده که ${gapsMine} موردش با یک اقدام مشخص از طرف ما بسته می‌شود.

## روش سنجش (ثابت و قابل بازتولید)

${data.coverageSummary.method}

## درصد هر سند

| سند | جهت | تاریخ | پوشش | وضعیت |
| --- | --- | --- | --- | --- |
`;

for (const r of scored) {
  const state = r.coveragePercent === 100 ? "✅ کامل" : r.coveragePercent >= 80 ? "🟡 خوب، با شکاف" : "🟠 ناقص";
  md += `| ${r.subject} | ${dirFa[r.direction] ?? r.direction} | ${r.date}${r.time ? " " + r.time : ""} | **${r.coveragePercent}%** | ${state} |\n`;
}

md += `\n## جزئیات امتیاز\n`;
for (const r of scored) {
  md += `\n### ${r.subject} — ${r.coveragePercent}%\n\n| معیار | وضعیت | امتیاز |\n| --- | --- | --- |\n`;
  for (const [key, b] of Object.entries(r.coverageBreakdown)) {
    md += `| ${label[key]} | ${stateFa[b.state] ?? b.state} | ${b.points} از ${b.max} |\n`;
  }
  if (r.gaps?.length) md += `\n**شکاف‌ها:**\n${r.gaps.map((g) => `- ${g}`).join("\n")}\n`;
}

md += `\n## آنچه هنوز آرشیو نشده (${gaps.length} مورد)\n\n| مورد | الان کجاست | مسئول | چطور بسته می‌شود |\n| --- | --- | --- | --- |\n`;
for (const g of gaps) md += `| ${g.item} | ${g.where} | ${g.owner} | ${g.how} |\n`;

md += `\n## قاعده‌ها\n\n${data.coverageNote}\n\n`;
md += `**بایگانی خصوصی (بیرون از گیت و بیرون از سایت):**\n\n`;
md += records.filter((r) => r.privateArchive).map((r) => `- \`${r.privateArchive}\` — ${r.subject}`).join("\n") + `\n`;

writeFileSync(outPath, md);
console.log(`archive coverage: overall ${overall}% across ${scored.length} documents (${complete} complete, ${gaps.length} gaps)`);
console.log(`report written: ${outPath}`);

if (scored.length === 0) process.exit(1);
