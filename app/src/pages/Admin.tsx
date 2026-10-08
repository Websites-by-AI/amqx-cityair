import { useEffect, useState } from "react";

/* ------------------------------------------------------------------ */
/* CityAir — admin panel for the private correspondence database.      */
/* No private data is bundled with this page: everything is fetched    */
/* after login, over the token-guarded /api/admin/* API.               */
/* ------------------------------------------------------------------ */

const API_BASE: string =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_BASE?.replace(/\/$/, "") ?? "";

const api = (path: string, init: RequestInit = {}) => fetch(`${API_BASE}${path}`, init);

const jsonPost = (path: string, body: unknown, token?: string) =>
  api(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });

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

const today = () => new Date().toISOString().slice(0, 10);
type AnyRec = Record<string, any>;

const TABS = [
  ["letters", "نامه‌ها"],
  ["contacts", "تماس‌ها"],
  ["tasks", "پیگیری‌ها"],
  ["notes", "یادداشت‌های مهم"],
  ["log", "گزارش دسترسی"],
] as const;

export default function Admin() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string>(() => sessionStorage.getItem("ca-admin-token") ?? "");
  const [adminName, setAdminName] = useState<string>(() => sessionStorage.getItem("ca-admin-name") ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [db, setDb] = useState<AnyRec | null>(null);
  const [logEntries, setLogEntries] = useState<AnyRec[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>("letters");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ title: "", body: "", owner: "ما", due: "", priority: "B" });

  useEffect(() => {
    window.scrollTo(0, 0);
    // keep this route out of every index, everywhere
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow,noarchive";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, []);

  const logout = async (silent = false) => {
    if (token) await jsonPost("/api/admin/logout", {}, token).catch(() => null);
    sessionStorage.removeItem("ca-admin-token");
    sessionStorage.removeItem("ca-admin-name");
    setToken("");
    setAdminName("");
    setDb(null);
    setPassword("");
    if (!silent) setStatus("از حساب خارج شدید.");
  };

  const loadDb = async (activeToken: string) => {
    const res = await api("/api/admin/db", { headers: { authorization: `Bearer ${activeToken}` } });
    if (res.status === 401) {
      await logout(true);
      setError("نشست منقضی شد — دوباره وارد شوید.");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error ?? "خطا در خواندن دیتابیس"); return; }
    setDb(data.db);
    const logRes = await api("/api/admin/log", { headers: { authorization: `Bearer ${activeToken}` } });
    if (logRes.ok) setLogEntries((await logRes.json()).entries ?? []);
  };

  useEffect(() => {
    if (token) loadDb(token);
    // auto-logout after the server-side token TTL
    const timer = window.setTimeout(() => token && logout(true), 30 * 60 * 1000);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      const res = await jsonPost("/api/admin/login", { name, password });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 429
            ? "تعداد تلاش‌های ناموفق زیاد شد — ۱۵ دقیقه قفل است."
            : res.status === 503
              ? "ورود ادمین روی این نسخه تنظیم نشده است (fail-closed)."
              : `ورود ناموفق بود${typeof data.attemptsLeft === "number" ? ` — ${data.attemptsLeft} تلاش باقی مانده` : ""}.`,
        );
        return;
      }
      sessionStorage.setItem("ca-admin-token", data.token);
      sessionStorage.setItem("ca-admin-name", data.name);
      setToken(data.token); setAdminName(data.name); setPassword("");
    } finally {
      setBusy(false);
    }
  };

  const addRecord = async (collection: string, record: AnyRec) => {
    const res = await jsonPost("/api/admin/record", { collection, record }, token);
    if (res.status === 401) return logout(true);
    setStatus(res.ok ? "ذخیره شد ✓" : "ذخیره نشد ✗");
    window.setTimeout(() => setStatus(""), 2500);
    if (res.ok) loadDb(token);
  };

  const removeRecord = async (collection: string, id: string) => {
    if (!window.confirm("این مورد حذف شود؟")) return;
    const res = await api(`/api/admin/record?collection=${collection}&id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return logout(true);
    setStatus(res.ok ? "حذف شد ✓" : "حذف نشد ✗");
    window.setTimeout(() => setStatus(""), 2500);
    if (res.ok) loadDb(token);
  };

  /* ---------------------------------------------------------------- login view */
  if (!token || !db) {
    return (
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">🔒</span>
            <div>
              <h1 className="text-lg font-bold text-slate-900">پنل ادمین — دیتابیس خصوصی</h1>
              <p className="text-[11px] text-slate-500">دسترسی محدود · همه‌ی تلاش‌ها ثبت می‌شود · نشست ۳۰ دقیقه</p>
            </div>
          </div>

          <form onSubmit={login} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">نام ادمین</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
                placeholder="ann"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-700">رمز ورود</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
            </label>
            {error && <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy ? "در حال بررسی…" : "ورود"}
            </button>
          </form>

          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
            رمز روی سرور فقط به‌صورت هش نمک‌دار نگه‌داری می‌شود و در مخزن GitHub یا بستهٔ عمومی سایت وجود ندارد.
            پس از ۵ تلاش ناموفق، ورود برای ۱۵ دقیقه قفل می‌شود. اگر این نسخه روی دامنه‌ی عمومی است، رمز بلند بگذارید.
          </p>
        </div>
      </div>
    );
  }

  const letters: AnyRec[] = db.letters ?? [];
  const contacts: AnyRec[] = db.contacts ?? [];
  const tasks: AnyRec[] = db.tasks ?? [];
  const notes: AnyRec[] = db.notes ?? [];

  /* ---------------------------------------------------------------- panel view */
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
        <div>
          <h1 className="text-xl font-bold">پنل ادمین — دیتابیس خصوصی مکاتبات</h1>
          <p className="mt-1 text-xs text-slate-300">
            خوش آمدید <span className="font-bold text-white">{adminName}</span> ·{" "}
            {letters.length} نامه · {contacts.length} تماس · {tasks.length} پیگیری · {notes.length} یادداشت
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => download(`cityair-private-db-${today()}.json`, JSON.stringify(db, null, 2), "application/json;charset=utf-8")}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20"
          >
            خروجی کامل JSON
          </button>
          <button onClick={() => loadDb(token)} className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/20">
            بازخوانی
          </button>
          <button onClick={() => logout()} className="rounded-lg bg-rose-500/90 px-3 py-2 text-xs font-semibold hover:bg-rose-500">
            خروج
          </button>
        </div>
      </header>

      {status && <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">{status}</p>}

      <nav className="mt-5 flex flex-wrap gap-2">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === key ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700"}`}
          >
            {label}
            {key === "letters" && ` (${letters.length})`}
            {key === "contacts" && ` (${contacts.length})`}
            {key === "tasks" && ` (${tasks.length})`}
            {key === "notes" && ` (${notes.length})`}
          </button>
        ))}
      </nav>

      {/* ------------------------------------------------ letters */}
      {tab === "letters" && (
        <section className="mt-5 space-y-4">
          {letters.map((l) => (
            <article key={l.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[11px] font-semibold text-white">{l.direction}</span>
                <span className="text-xs text-slate-500">{l.date}{l.time ? ` · ${l.time}` : ""} · {l.channel}</span>
                <span className="ms-auto rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
                  {l.publicationRule}
                </span>
              </div>
              <h3 className="mt-2 text-sm font-bold text-slate-900">{l.subject}</h3>
              <p className="mt-1 text-[11px] text-slate-500">از {l.from} → {l.to}</p>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-[12px] leading-6 text-slate-800">
{String(l.bodyFull)}
              </pre>
              {l.completeness && <p className="mt-2 text-[11px] text-slate-600"><b>کامل بودن:</b> {l.completeness}</p>}
              {l.nextAction && <p className="mt-1 text-[11px] text-slate-600"><b>قدم بعدی:</b> {l.nextAction}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => navigator.clipboard?.writeText(String(l.bodyFull))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold"
                >
                  کپی متن کامل
                </button>
                <button
                  onClick={() => download(`private-letter-${l.id}.txt`, String(l.bodyFull))}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] font-semibold"
                >
                  دانلود .txt
                </button>
                <button
                  onClick={() => removeRecord("letters", l.id)}
                  className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700"
                >
                  حذف
                </button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ------------------------------------------------ contacts */}
      {tab === "contacts" && (
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          {contacts.map((c) => (
            <article key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{c.name}</h3>
                  <p className="text-[11px] text-slate-500">{c.role}</p>
                  <p className="text-[11px] text-slate-500">{c.org}</p>
                </div>
                {c.flags?.unverified && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">UNVERIFIED</span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-700"><b>وضعیت:</b> {c.status}</p>

              <div className="mt-3 rounded-lg bg-slate-900/5 p-3">
                <div className="text-[11px] font-bold text-slate-700">اطلاعات خصوصی (فقط اینجا)</div>
                <dl className="mt-1 space-y-1 text-[11px] leading-5 text-slate-700">
                  {Object.entries(c.private ?? {}).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <dt className="font-semibold">{k}:</dt>
                      <dd className="whitespace-pre-wrap break-words">{Array.isArray(v) ? v.join(" · ") : String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {c.public && Object.keys(c.public).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(c.public).map(([k, v]) => (
                    <a key={k} href={String(v)} target="_blank" rel="noopener noreferrer"
                       className="rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-sky-700">
                      {k} ↗
                    </a>
                  ))}
                </div>
              )}
              {typeof c.flags?.consentToPublishFullText === "boolean" && (
                <p className="mt-2 text-[11px] text-slate-600">
                  اجازه‌ی انتشار متن کامل: <b>{c.flags.consentToPublishFullText ? "دارد" : "ندارد"}</b>
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      {/* ------------------------------------------------ tasks */}
      {tab === "tasks" && (
        <section className="mt-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900">افزودن پیگیری / اطلاعات مهم</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-4">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="موضوع"
                     className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
              <input value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} placeholder="مهلت (YYYY-MM-DD)"
                     className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
                {["A", "B", "C"].map((p) => <option key={p} value={p}>اولویت {p}</option>)}
              </select>
            </div>
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="توضیح، لینک، شماره تماس، هر نکته‌ی مهمی که باید در دیتابیس بماند…"
                      className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} />
            <button
              onClick={async () => {
                if (!form.title.trim()) return;
                await addRecord("tasks", { ...form, status: "باز" });
                setForm({ title: "", body: "", owner: "ما", due: "", priority: "B" });
              }}
              className="mt-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white"
            >
              ذخیره در دیتابیس
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">موضوع</th>
                  <th className="px-3 py-2 text-start font-semibold">اولویت</th>
                  <th className="px-3 py-2 text-start font-semibold">مهلت</th>
                  <th className="px-3 py-2 text-start font-semibold">وضعیت</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-900">{t.title}</div>
                      {t.body && <div className="text-[11px] text-slate-500">{t.body}</div>}
                    </td>
                    <td className="px-3 py-2">{t.priority}</td>
                    <td className="px-3 py-2">{t.due || "—"}</td>
                    <td className="px-3 py-2">{t.status}</td>
                    <td className="px-3 py-2 text-end">
                      <button onClick={() => removeRecord("tasks", t.id)} className="text-rose-600 hover:underline">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ------------------------------------------------ notes */}
      {tab === "notes" && (
        <section className="mt-5 grid gap-4 md:grid-cols-2">
          {notes.map((n) => (
            <article key={n.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-slate-700">{n.body}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(n.tags ?? []).map((t: string) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">{t}</span>
                ))}
                <button onClick={() => removeRecord("notes", n.id)} className="ms-auto text-[11px] text-rose-600 hover:underline">حذف</button>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* ------------------------------------------------ access log */}
      {tab === "log" && (
        <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">زمان</th>
                <th className="px-3 py-2 text-start font-semibold">اقدام</th>
                <th className="px-3 py-2 text-start font-semibold">نتیجه</th>
                <th className="px-3 py-2 text-start font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logEntries.length === 0 && (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-slate-500">سندی ثبت نشده</td></tr>
              )}
              {logEntries.map((e, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-slate-500">{String(e.at).replace("T", " ").slice(0, 19)}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">{e.action}{e.collection ? ` · ${e.collection}` : ""}</td>
                  <td className="px-3 py-2">{e.result}</td>
                  <td className="px-3 py-2 text-slate-500">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <p className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4 text-[11px] leading-6 text-slate-600">
        این صفحه در منوی سایت نیست و با <code>noindex</code> علامت خورده است. داده‌ی خصوصی هرگز داخل بستهٔ عمومی
        نمی‌رود؛ فقط پس از ورود موفق و با توکن ۳۰ دقیقه‌ای از سرور خوانده می‌شود. بستن مرورگر یا زدن «خروج»، توکن را باطل می‌کند.
      </p>
    </div>
  );
}
