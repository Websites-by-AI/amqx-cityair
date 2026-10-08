import { useEffect, useState, type ReactNode } from "react";
import { cn } from "./ui";
import { IconAir, IconClose, IconMenu } from "./icons";

export const NAV: { href: string; label: string; xlOnly?: boolean }[] = [
  { href: "#/", label: "Home" },
  { href: "#/expo", label: "EXPO 2026" },
  { href: "#/partners", label: "Partners", xlOnly: true },
  { href: "#/guidance", label: "Guidance" },
  { href: "#/assess", label: "Assess" },
  { href: "#/results", label: "Results" },
  { href: "#/action-plan", label: "Action plan" },
  { href: "#/cities", label: "Cities" },
  { href: "#/innovations", label: "Innovations" },
  { href: "#/innovation-match", label: "Matches" },
  { href: "#/resources", label: "Resources", xlOnly: true },
  { href: "#/methodology", label: "Method", xlOnly: true },
  { href: "#/about", label: "About" },
  { href: "#/assistant", label: "Assistant" },
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
          {SITE.tagline}
        </span>
      </span>
    </a>
  );
}

function TopBar() {
  return (
    <div className="no-print hidden bg-brand-950 py-1.5 text-[11px] text-brand-100 md:block">
      <div className="container-page flex items-center justify-between">
        <p>
          Independent prototype · illustrative demonstration data · not an official AQMx, CCAC,
          WRI, NASA or XPRIZE product
        </p>
        <div className="flex items-center gap-4">
          <a className="hover:text-white" href={SITE.hfDataset} target="_blank" rel="noreferrer">
            Knowledge base (Hugging Face)
          </a>
          <a className="hover:text-white" href={SITE.botUrl} target="_blank" rel="noreferrer">
            Telegram bot
          </a>
          <a className="hover:text-white" href={SITE.github} target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

function Header({ route }: { route: string }) {
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
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="#/assess"
            className="hidden rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 sm:inline-block"
          >
            Start assessment
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
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  const cols: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      title: "Platform",
      links: [
        { label: "Guidance domains", href: "#/guidance" },
        { label: "Readiness assessment", href: "#/assess" },
        { label: "City explorer", href: "#/cities" },
        { label: "Innovation library", href: "#/innovations" },
        { label: "ISAF Smartex 2026 (Istanbul)", href: "#/expo" },
        { label: "Partners & outreach archive", href: "#/partners" },
        { label: "AI assistant", href: "#/assistant" },
      ],
    },
    {
      title: "Open data & code",
      links: [
        { label: "GitHub repository", href: SITE.github, external: true },
        { label: "Knowledge base dataset", href: SITE.hfDataset, external: true },
        { label: "Hugging Face mirror", href: SITE.hfSpace, external: true },
        { label: "Telegram bot", href: SITE.botUrl, external: true },
      ],
    },
    {
      title: "Method & policy",
      links: [
        { label: "Methodology", href: "#/methodology" },
        { label: "Resources", href: "#/resources" },
        { label: "About & disclaimers", href: "#/about" },
      ],
    },
  ];

  return (
    <footer data-site-chrome="true" className="mt-20 border-t border-brand-900/10 bg-brand-950 text-brand-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-6 text-brand-200">
            An independent platform for city teams to diagnose air-quality readiness, plan action
            and reuse validated implementation knowledge.
          </p>
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
          <p>
            © {new Date().getFullYear()} CityAir (independent prototype). Demo city scores are
            illustrative and are not official rankings.
          </p>
          <p>
            Air-quality readings by Open-Meteo · Knowledge base mirrored on Hugging Face ·
            Hosted on Cloudflare
          </p>
        </div>
      </div>
    </footer>
  );
}

export function Shell({ route, children }: { route: string; children: ReactNode }) {
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
        Skip to content
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
