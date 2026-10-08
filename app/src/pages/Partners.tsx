import { useEffect, useMemo, useState } from "react";
import partners from "../data/partners.json";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const today = () => new Date().toISOString().slice(0, 10);

function download(filename: string, text: string, type = "text/plain;charset=utf-8") {
  const blob = new Blob(["\ufeff" + text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return Promise.resolve(ok);
}

const statusTone = (status: string): string => {
  const s = status.toLowerCase();
  if (s.includes("positive") || s.includes("興趣") || s.includes("پاسخ مثبت")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s.includes("sent") || s.includes("awaiting") || s.includes("waiting")) return "bg-amber-50 text-amber-800 ring-amber-200";
  if (s.includes("pending") || s.includes("informal") || s.includes("preparation")) return "bg-sky-50 text-sky-700 ring-sky-200";
  if (s.includes("open")) return "bg-violet-50 text-violet-700 ring-violet-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

type AnyRec = Record<string, any>;

/* ------------------------------------------------------------------ */
/* Small blocks                                                        */
/* ------------------------------------------------------------------ */

function SectionTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <div className="text-[11px] font-semibold tracking-[0.18em] text-sky-700">{kicker}</div>
      <h2 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      {sub && <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{sub}</p>}
    </div>
  );
}

function Chip({ children, tone = "bg-slate-100 text-slate-700 ring-slate-200" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${tone}`}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Partners() {
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<"all" | "incoming" | "outgoing" | "internal">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [openArchive, setOpenArchive] = useState<string | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const contacts: AnyRec[] = partners.contacts as AnyRec[];
  const archive: AnyRec[] = partners.archive as AnyRec[];
  const milestones: AnyRec[] = partners.milestones as AnyRec[];
  const co: AnyRec = partners.cooperation as AnyRec;
  const cs: AnyRec = (partners as AnyRec).coverageSummary ?? {};

  const filteredArchive = useMemo(() => {
    const q = query.trim().toLowerCase();
    return archive.filter((e) => {
      const dirOk =
        direction === "all" ||
        (direction === "incoming" && /in/i.test(String(e.direction))) ||
        (direction === "outgoing" && /out/i.test(String(e.direction))) ||
        (direction === "internal" && /(internal|person)/i.test(String(e.direction)));
      if (!dirOk) return false;
      if (!q) return true;
      return [e.from, e.to, e.subject, e.body, e.channel].join(" ").toLowerCase().includes(q);
    });
  }, [archive, query, direction]);

  const stats = useMemo(() => {
    const positive = contacts.filter((c) => /positive|پاسخ مثبت/i.test(String(c.status))).length;
    const awaiting = contacts.filter((c) => /sent|awaiting|pending|open|preparation/i.test(String(c.status))).length;
    return { total: contacts.length, positive, awaiting, events: milestones.length };
  }, [contacts, milestones]);

  const letterText = (e: AnyRec) =>
    [
      `Subject: ${e.subject}`,
      `Date: ${e.date}${e.time ? " " + e.time : ""}`,
      `Channel: ${e.channel}`,
      `From: ${e.from}`,
      `To: ${e.to}`,
      "",
      String(e.body),
      "",
      "—",
      "GreenHope Initiative · CityAir by AQMx prototype",
      "Published: " + today(),
    ].join("\n");

  const doCopy = async (id: string, text: string) => {
    const ok = await copyText(text);
    setCopied(ok ? id : "ERR:" + id);
    window.setTimeout(() => setCopied(null), 2200);
  };

  return (
    <div className="oh-page mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ------------------------------------------------------------ */}
      {/* Hero                                                          */}
      {/* ------------------------------------------------------------ */}
      <header className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-sky-50 p-6 sm:p-8 print:border-0 print:bg-white print:p-0">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="bg-sky-600 text-white ring-sky-600">ARCHIVE</Chip>
          <Chip tone="bg-emerald-50 text-emerald-700 ring-emerald-200">updated {partners.meta.updated}</Chip>
          <Chip tone="bg-amber-50 text-amber-800 ring-amber-200">status stated as it is — no partnership claimed</Chip>
        </div>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {partners.meta.title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{partners.meta.intro}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            { k: "Contact records", v: stats.total },
            { k: "Positive reply", v: stats.positive },
            { k: "Awaiting / open", v: stats.awaiting },
            { k: "Dated milestones", v: stats.events },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-slate-200 bg-white/80 p-3">
              <div className="text-2xl font-bold text-slate-900">{s.v}</div>
              <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{s.k}</div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 print:hidden">
          <a href="#/expo" className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700">
            Company outreach — EXPO 2026
          </a>
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-400"
          >
            Print / save as PDF
          </button>
          <button
            onClick={() =>
              download(
                `cityair-archive-${today()}.json`,
                JSON.stringify({ exported: today(), milestones, contacts, cooperation: co, archive }, null, 2),
                "application/json;charset=utf-8",
              )
            }
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:border-slate-400"
          >
            Export full record (JSON)
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------ */}
      {/* Archive coverage                                             */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-12" id="coverage">
        <SectionTitle
          kicker="ARCHIVE COVERAGE"
          title="چند درصد از مکاتبات تا امروز آرشیو شده؟"
          sub={String(cs.method ?? "")}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
            <div className="flex items-end gap-2">
              <div className="text-5xl font-extrabold tracking-tight text-slate-900">{cs.overallPercent}%</div>
              <div className="pb-1 text-xs text-slate-500">میانگین پوشش {cs.documents} سند</div>
            </div>
            <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500" style={{ width: `${cs.overallPercent}%` }} />
            </div>
            <dl className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <dt>سند ۱۰۰٪ کامل</dt><dd className="font-bold text-emerald-700">{cs.completeDocuments} از {cs.documents}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>سند با شکاف</dt><dd className="font-bold text-amber-700">{cs.partialDocuments}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>متن فقط در بایگانی خصوصی</dt><dd className="font-bold text-slate-800">{cs.privateOnlyDocuments}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>شکاف ثبت‌شده</dt><dd className="font-bold text-slate-800">{cs.gapCount} ({cs.gapsOurs} مورد مال ما)</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-600">
              این درصد «کامل بودن آرشیو» است، نه پیشرفت همکاری. صفر درصد از این صفحه یعنی «مذاکره» —
              هیچ‌کدام از اسناد، شراکت امضاشده نیست.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <h3 className="text-sm font-bold text-slate-900">پوشش هر سند</h3>
            <div className="mt-3 space-y-3">
              {(cs.perDocument ?? []).map((doc: AnyRec) => (
                <div key={doc.id}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-slate-700" title={doc.subject}>{doc.subject}</span>
                    <span className={`font-bold ${doc.percent === 100 ? "text-emerald-700" : doc.percent >= 80 ? "text-amber-700" : "text-orange-700"}`}>
                      {doc.percent}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${doc.percent === 100 ? "bg-emerald-500" : doc.percent >= 80 ? "bg-amber-500" : "bg-orange-400"}`}
                      style={{ width: `${doc.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* gap register */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/40">
          <div className="border-b border-amber-200 px-4 py-3">
            <h3 className="text-sm font-bold text-amber-900">آنچه هنوز آرشیو نشده ({cs.gapCount} مورد)</h3>
            <p className="mt-1 text-[11px] leading-5 text-amber-900/80">
              هر شکاف یک مسئول و یک اقدام مشخص دارد. «مسئول = ما» یعنی با یک قدم از طرف ما بسته می‌شود.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-amber-100/60 text-amber-900">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">مورد</th>
                  <th className="px-3 py-2 text-start font-semibold">الان کجاست</th>
                  <th className="px-3 py-2 text-start font-semibold">مسئول</th>
                  <th className="px-3 py-2 text-start font-semibold">چطور بسته می‌شود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 bg-white/70">
                {(partners.gapRegister as AnyRec[]).map((g) => (
                  <tr key={g.item}>
                    <td className="px-3 py-2 font-medium text-slate-900">{g.item}</td>
                    <td className="px-3 py-2 text-slate-600">{g.where}</td>
                    <td className="px-3 py-2">
                      <Chip tone={g.owner === "ما" ? "bg-sky-50 text-sky-700 ring-sky-200" : g.owner === "آن‌ها" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>
                        {g.owner}
                      </Chip>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{g.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Timeline                                                      */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-12">
        <SectionTitle
          kicker="CHRONOLOGY"
          title="خط زمانی رویدادها و مکاتبات"
          sub="همه‌ی تاریخ‌ها با منبع مستند شده‌اند. رویدادهایی که در آینده‌اند با برچسب «در آماده‌سازی» مشخص شده‌اند."
        />
        <ol className="relative space-y-6 border-s-2 border-slate-200 ps-6">
          {milestones.map((m) => (
            <li key={m.title} className="relative">
              <span className="absolute -start-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-sky-600 ring-1 ring-sky-200" />
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-sky-700">{m.date}</span>
                  {m.type && <Chip>{m.type}</Chip>}
                </div>
                <h3 className="mt-1 text-base font-bold text-slate-900">{m.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700">{m.body}</p>
                {m.cityAirRole && (
                  <p className="mt-2 text-sm leading-7 text-slate-600 ring-slate-200">
                    <span className="font-semibold text-slate-800">جایگاه ما: </span>
                    {m.cityAirRole}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.link && (
                    <a href={m.link} className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400">
                      صفحه‌ی مرتبط
                    </a>
                  )}
                  {(m.sources ?? []).map((s: AnyRec) => (
                    <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-sky-700 hover:border-sky-400">
                      {s.label} ↗
                    </a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Contacts                                                      */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-14">
        <SectionTitle
          kicker="OUTREACH REGISTER"
          title="فهرست تماس‌ها و وضعیت هر گفتگو"
          sub="هیچ‌کدام از این ردیف‌ها «همکاری امضاشده» نیست؛ وضعیت هر مورد همان‌طور که هست نوشته شده است."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          {contacts.map((c) => (
            <article key={c.org + c.contact} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{c.org}</h3>
                  <p className="text-xs text-slate-500">{c.country} · {c.type}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Chip tone={statusTone(String(c.status))}>{c.status}</Chip>
                  <Chip>priority {c.priority}</Chip>
                </div>
              </div>

              <dl className="mt-3 space-y-2 text-sm leading-6">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contact</dt>
                  <dd className="text-slate-800">{c.contact}</dd>
                </div>
                {c.programme && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Context</dt>
                    <dd className="text-slate-700">{c.programme}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">What we proposed</dt>
                  <dd className="text-slate-700">{c.proposal}</dd>
                </div>
                {c.response && c.response !== "—" && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">What came back</dt>
                    <dd className="text-slate-700">{c.response}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Next action</dt>
                  <dd className="font-medium text-slate-900">{c.next}</dd>
                </div>
              </dl>

              {c.verification && c.verification !== "—" && (
                <p className={`mt-3 rounded-lg p-2.5 text-[11px] leading-5 ${/UNVERIFIED/i.test(c.verification) ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600"}`}>
                  {c.verification}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {(c.links ?? []).map((l: AnyRec) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target={l.url.startsWith("#") ? undefined : "_blank"}
                    rel={l.url.startsWith("#") ? undefined : "noopener noreferrer"}
                    className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-sky-700 hover:border-sky-400"
                  >
                    {l.label}{l.url.startsWith("#") ? "" : " ↗"}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Cooperation plan                                              */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-14">
        <SectionTitle
          kicker="COOPERATION PLAN"
          title={String(co.headline)}
          sub={String(co.principle)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
            <h3 className="text-sm font-bold text-sky-900">CityAir adds</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {(co.cityAirAdds as string[]).map((x) => (
                <li key={x} className="flex gap-2"><span className="text-sky-600">▸</span><span>{x}</span></li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <h3 className="text-sm font-bold text-emerald-900">MoveGreen brings</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {(co.moveGreenBrings as string[]).map((x) => (
                <li key={x} className="flex gap-2"><span className="text-emerald-600">▸</span><span>{x}</span></li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {(co.workstreams as AnyRec[]).map((w) => (
            <article key={w.n} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{w.n}</span>
                <h3 className="text-sm font-bold text-slate-900">{w.title}</h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Chip tone="bg-slate-100 text-slate-700 ring-slate-200">{w.lead}</Chip>
                <Chip tone="bg-sky-50 text-sky-700 ring-sky-200">{w.timing}</Chip>
              </div>
              <p className="mt-2 text-sm leading-7 text-slate-700">{w.body}</p>
              <p className="mt-2 text-xs text-slate-600"><span className="font-semibold text-slate-800">Deliverable: </span>{w.deliverable}</p>
            </article>
          ))}
        </div>

        {/* AQMx alignment */}
        <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">هم‌راستایی با ساختار AQMx</h3>
          <p className="mt-2 text-xs leading-6 text-slate-600">
            AQMx یک «فروشگاه یک‌جا» برای دانش، ابزار، داده و راهنمای مدیریت کیفیت هوا است؛ نه رقیب ما. آنچه در ادامه می‌آید،
            درک ما از محل اتصال است و هر تصمیمی درباره‌ی پذیرش، فهرست‌کردن یا انتشار بر عهده‌ی خود AQMx است.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
            {(co.aqmAlignment as string[]).map((x) => (
              <li key={x} className="flex gap-2"><span className="text-slate-400">•</span><span>{x}</span></li>
            ))}
          </ul>
        </div>

        {/* 90 days */}
        <div className="mt-8">
          <h3 className="text-sm font-bold text-slate-900">نقشه‌ی ۹۰ روز</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {(co.ninetyDays as AnyRec[]).map((b) => (
              <div key={b.window} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="text-xs font-bold text-sky-700">{b.window}</div>
                <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-700">
                  {(b.items as string[]).map((x) => (
                    <li key={x} className="flex gap-2"><span className="text-slate-400">–</span><span>{x}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">پنج درخواست مشخص (asks)</h3>
            <ol className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
              {(co.asks as string[]).map((x, i) => (
                <li key={x} className="flex gap-2"><span className="font-semibold text-slate-500">{i + 1}.</span><span>{x}</span></li>
              ))}
            </ol>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <h3 className="text-sm font-bold text-amber-900">ریسک‌ها و پاسخ ما</h3>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-800">
              {(co.risks as AnyRec[]).map((r) => (
                <li key={r.risk}>
                  <div className="font-semibold">{r.risk}</div>
                  <div className="text-slate-700">{r.mitigation}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Archive                                                       */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-14">
        <SectionTitle
          kicker="ARCHIVE"
          title="متن مکاتبات (بایگانی)"
          sub="خروجی‌ها کامل و واژه‌به‌واژه ثبت شده‌اند. پیام‌های دریافتی از اشخاص ثالث، به احترام حریم خصوصی، خلاصه شده‌اند؛ متن کامل در بایگانی خصوصی پروژه نگهداری می‌شود."
        />

        <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جست‌وجو در بایگانی…"
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
          />
          {(
            [
              ["all", "همه"],
              ["outgoing", "خروجی"],
              ["incoming", "دریافتی"],
              ["internal", "یادداشت داخلی"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDirection(val)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${direction === val ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
            >
              {label}
            </button>
          ))}
          <span className="ms-auto text-xs text-slate-500">{filteredArchive.length} از {archive.length}</span>
        </div>

        <div className="space-y-4">
          {filteredArchive.map((e) => {
            const tone =
              e.direction === "outgoing" ? "bg-sky-50 text-sky-700 ring-sky-200"
              : e.direction === "incoming" ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-slate-100 text-slate-700 ring-slate-200";
            const open = openArchive === e.id;
            return (
              <article key={e.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <Chip tone={tone}>{e.direction}</Chip>
                  <span className="text-xs font-semibold text-slate-600">{e.date}{e.time ? ` · ${e.time}` : ""}</span>
                  <Chip>{e.status}</Chip>
                  {typeof e.coveragePercent === "number" && (
                    <Chip
                      tone={
                        e.coveragePercent === 100
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : e.coveragePercent >= 80
                            ? "bg-amber-50 text-amber-800 ring-amber-200"
                            : "bg-orange-50 text-orange-800 ring-orange-200"
                      }
                    >
                      پوشش {e.coveragePercent}%
                    </Chip>
                  )}
                  <span className="ms-auto text-[11px] text-slate-500">{e.channel}</span>
                </div>

                <div className="p-4">
                  <h3 className="text-sm font-bold text-slate-900">{e.subject}</h3>
                  <div className="mt-1 grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
                    <div><span className="font-semibold text-slate-700">From: </span>{e.from}</div>
                    <div><span className="font-semibold text-slate-700">To: </span>{e.to}</div>
                  </div>

                  <div className={`oh-letter mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 ${open ? "" : "max-h-56 overflow-hidden"}`}>
                    <pre className="oh-letter-text whitespace-pre-wrap break-words font-sans text-[13px] leading-7 text-slate-800">
{String(e.body)}
                    </pre>
                  </div>

                  {e.notes && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-[11px] leading-5 text-slate-600">{e.notes}</p>
                  )}

                  {e.signature && (
                    <p className="mt-2 text-[11px] leading-5 text-slate-500"><span className="font-semibold text-slate-700">امضا: </span>{e.signature}</p>
                  )}

                  {(e.links ?? []).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(e.links as AnyRec[]).map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                           className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-sky-700 hover:border-sky-400">
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  )}

                  {(e.gaps ?? []).length > 0 && (
                    <details className="mt-3 rounded-lg bg-amber-50/70 p-2.5">
                      <summary className="cursor-pointer text-[11px] font-semibold text-amber-900">
                        شکاف‌های همین سند ({(e.gaps as string[]).length})
                      </summary>
                      <ul className="mt-2 space-y-1 text-[11px] leading-5 text-amber-900/90">
                        {(e.gaps as string[]).map((g) => <li key={g} className="flex gap-1.5"><span>•</span><span>{g}</span></li>)}
                      </ul>
                    </details>
                  )}

                  {e.privateArchive && (
                    <p className="mt-2 rounded-lg bg-slate-900/5 p-2.5 text-[11px] leading-5 text-slate-700">
                      <span className="font-semibold">متن کامل در بایگانی خصوصی پروژه</span> (بیرون از سایت عمومی و بیرون از GitHub):
                      <code className="mx-1 rounded bg-white px-1 py-0.5 text-[10px] text-slate-600">{e.privateArchive}</code>
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 print:hidden">
                    <button
                      onClick={() => setOpenArchive(open ? null : e.id)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
                    >
                      {open ? "بستن متن" : "نمایش کامل متن"}
                    </button>
                    <button
                      onClick={() => doCopy(e.id, letterText(e))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
                    >
                      {copied === e.id ? "کپی شد ✓" : copied === "ERR:" + e.id ? "کپی نشد" : "کپی متن"}
                    </button>
                    <button
                      onClick={() => download(`cityair-letter-${e.id}.txt`, letterText(e))}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
                    >
                      دانلود .txt
                    </button>
                    <button
                      onClick={() => download(`cityair-letter-${e.id}.md`, `# ${e.subject}\n\n${letterText(e)}\n`, "text/markdown;charset=utf-8")}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:border-slate-400"
                    >
                      دانلود .md
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredArchive.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              موردی با این فیلتر پیدا نشد.
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Org strip + privacy                                           */}
      {/* ------------------------------------------------------------ */}
      <section className="mt-14">
        <SectionTitle
          kicker="REFERENCED ORGANISATIONS"
          title="نهادهای مرتبط"
          sub="فهرست متنی است؛ هیچ لوگوی رسمی بدون اجازه‌ی کتبی مالک حقوق روی سایت نمایش داده نمی‌شود."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(partners.organisationStrip as AnyRec[]).map((o) => (
            <a
              key={o.label}
              href={o.url}
              target={o.url.startsWith("#") ? undefined : "_blank"}
              rel={o.url.startsWith("#") ? undefined : "noopener noreferrer"}
              className="rounded-xl border border-slate-200 bg-white p-3 transition hover:border-sky-300 hover:shadow-sm"
            >
              <div className="text-sm font-bold text-slate-900">{o.label}</div>
              <div className="mt-1 text-[11px] leading-5 text-slate-600">{o.note}</div>
            </a>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">حریم خصوصی و دقت</h3>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-700">
            {(partners.privacy as string[]).map((p) => (
              <li key={p} className="flex gap-2"><span className="text-slate-400">✓</span><span>{p}</span></li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-xs leading-6 text-slate-500">
          این صفحه بخشی از پروژهٔ CityAir (نمونهٔ مستقل، ساخته‌شده توسط گروه GreenHope، بدون وابستگی رسمی به AQMx) است.
          وضعیت هر همکاری همان‌طور که در تاریخ {partners.meta.updated} بوده ثبت شده و با پیشرفت کار به‌روزرسانی می‌شود.
        </p>
      </section>
    </div>
  );
}
