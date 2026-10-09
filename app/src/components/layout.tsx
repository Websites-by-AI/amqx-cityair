import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./ui";
import { IconAir, IconClose, IconMenu } from "./icons";
import { LANGS, useI18n } from "../i18n";

export const NAV: { href: string; key: string; fallback?: string; xlOnly?: boolean }[] = [
  { href: "#/", key: "nav.home" },
  { href: "#/expo", key: "nav.expo", fallback: "EXPO 2026" },
  { href: "#/partners", key: "nav.partners", xlOnly: true },
  { href: "#/guidance", key: "nav.guidance" },
  { href: "#/assess", key: "nav.assess" },
  { href: "#/results", key: "nav.results" },
  { href: "#/action-plan", key: "nav.actionPlan" },
  { href: "#/cities", key: "nav.cities" },
  { href: "#/innovations", key: "nav.innovations" },
  { href: "#/innovation-match", key: "nav.matches" },
  { href: "#/resources", key: "nav.resources", xlOnly: true },
  { href: "#/methodology", key: "nav.method", xlOnly: true },
  { href: "#/about", key: "nav.about" },
  { href: "#/assistant", key: "nav.assistant" },
];

const SEASONAL = ["#/expo", "#/partners"];

export const SITE = {
  name: "CityAir",
  tagline: "Air-quality readiness & innovation exchange",
  domain: "aqmx.atikova.com",
  url: "https://aqmx.atikova.com",
  botUsername: "AQMX_cityair_tracker_bot",
  botUrl: "https://t.me/AQMX_cityair_tracker_bot",
  github: "https://github.com/Websites-by-AI/amqx-cityair",
  hfDataset: "https://huggingface.co/datasets/sosa123454321/amqx-cityair-kb",
  hfSpace: "https://sosa123454321-amqx-cityair.static.hf.space",
  contactEmail: "elasa2next@gmail.com",
};

export function Logo({ light }: { light?: boolean }) {
  const { t } = useI18n();
  return (
    <a href="#/" className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-sm">
        <IconAir size={22} />
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            "block text-lg font-extrabold tracking-tight",
            light ? "text-white" : "text-brand-950",
          )}
        >
          CityAir
        </span>
        <span className={cn("block text-[11px]", light ? "text-brand-100" : "text-slate-500")}>
          {t("chrome.tagline")}
        </span>
      </span>
    </a>
  );
}

function TopBar() {
  const { t } = useI18n();
  return (
    <div className="no-print hidden bg-brand-950 py-1.5 text-[11px] text-brand-100 md:block">
      <div className="container-page flex items-center justify-between">
        <p>{t("chrome.disclaimer")}</p>
        <div className="flex items-center gap-4">
          <a className="hover:text-white" href={SITE.hfDataset} target="_blank" rel="noreferrer">
            {t("chrome.kb")}
          </a>
          <a className="hover:text-white" href={SITE.botUrl} target="_blank" rel="noreferrer">
            {t("chrome.bot")}
          </a>
          <a className="hover:text-white" href={SITE.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

function LanguageSwitcher({ compact }: { compact?: boolean }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const active = LANGS.find((l) => l.code === lang);
  return (
    <div className="relative">
      <button
        data-testid="lang-switcher"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("chrome.language")}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] font-bold transition",
          compact
            ? "border-slate-300 text-brand-800 hover:border-brand-400"
            : "border-slate-300 text-brand-800 hover:border-brand-400",
        )}
      >
        <span aria-hidden="true">🌐</span>
        <span>{active?.flag ?? "EN"}</span>
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {LANGS.map((l) => (
            <button
              key={l.code}
              data-testid={`lang-${l.code}`}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-[13px] hover:bg-slate-50",
                l.code === lang ? "bg-slate-50 font-bold text-brand-800" : "text-slate-700",
              )}
            >
              <span>{l.native}</span>
              <span className="text-[10px] font-mono text-slate-400">{l.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Header({ route }: { route: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [route]);

  return (
    <header
      data-site-chrome="true"
      className={cn(
        "no-print sticky top-0 z-30 border-b bg-white/95 backdrop-blur transition",
        scrolled ? "border-slate-200 shadow-sm" : "border-transparent",
      )}
    >
      <div className="container-page flex items-center justify-between gap-4 py-3">
        <Logo />
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main">
          {NAV.filter((n) => n.href !== "#/").map((item) => {
            const active = route.startsWith(item.href.slice(1)) && item.href !== "#/";
            const highlight = SEASONAL.includes(item.href) && !active;
            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-[13px] font-semibold transition",
                  item.xlOnly && "hidden xl:block",
                  active
                    ? "bg-brand-50 text-brand-800"
                    : highlight
                      ? "bg-sun-100 text-sun-800 hover:bg-sun-100/80"
                      : "text-slate-600 hover:bg-slate-50 hover:text-brand-800",
                )}
              >
                {item.fallback ?? t(item.key)}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
          <a
            href="#/assess"
            className="hidden rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 sm:inline-block"
          >
            {t("chrome.start")}
          </a>
          <button
            className="rounded-lg border border-slate-300 p-2 text-brand-800 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            {open ? <IconClose size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-200 bg-white lg:hidden" aria-label="Mobile">
          <div className="container-page grid grid-cols-2 gap-1 py-3">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-brand-50"
              >
                {item.fallback ?? t(item.key)}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const { t } = useI18n();
  const cols: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: t("footer.platform"),
      links: [
        { label: t("footer.guidance"), href: "#/guidance" },
        { label: t("footer.assess"), href: "#/assess" },
        { label: t("footer.cities"), href: "#/cities" },
        { label: t("footer.innovations"), href: "#/innovations" },
        { label: t("footer.expo"), href: "#/expo" },
        { label: t("footer.partners"), href: "#/partners" },
        { label: t("footer.aiResearch"), href: "#/ai-research" },
        { label: t("footer.assistant"), href: "#/assistant" },
      ],
    },
    {
      title: t("footer.app"),
      links: [{ label: t("footer.apk"), href: "/downloads/cityair.apk", external: true }],
    },
    {
      title: t("footer.data"),
      links: [
        { label: t("footer.repo"), href: SITE.github, external: true },
        { label: t("footer.dataset"), href: SITE.hfDataset, external: true },
        { label: t("footer.mirror"), href: SITE.hfSpace, external: true },
        { label: t("footer.bot"), href: SITE.botUrl, external: true },
      ],
    },
    {
      title: t("footer.method"),
      links: [
        { label: t("footer.methodology"), href: "#/methodology" },
        { label: t("footer.resources"), href: "#/resources" },
        { label: t("footer.disclaimer"), href: "#/about" },
      ],
    },
  ];

  return (
    <footer data-site-chrome="true" className="mt-20 border-t border-brand-900/10 bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-6 text-brand-200">{t("footer.about")}</p>
          <p className="mt-4 text-xs text-brand-300">{SITE.domain}</p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-wider text-accent-300">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-brand-100 transition hover:text-white"
                    {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10 py-6">
        <div className="container-page flex flex-col gap-2 text-xs text-brand-300 md:flex-row md:items-center md:justify-between">
          <p>{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <p>{t("footer.stack")}</p>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ route, children }: { route: string; children: ReactNode }) {
  const { t } = useI18n();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [route]);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [route]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-800 focus:px-4 focus:py-2 focus:text-white"
      >
        {t("chrome.skip")}
      </a>
      <TopBar />
      <Header route={route} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
