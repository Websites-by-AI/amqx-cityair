import { useMemo, useState } from "react";
import expoJson from "@/data/expo.json";
import {
  Badge,
  Bullets,
  Button,
  Card,
  Disclaimer,
  PageHero,
  SectionTitle,
  cn,
  inputCls,
} from "@/components/ui";
import { IconCheck, IconExternal, IconSearch } from "@/components/icons";

type Presence = "exhibitor" | "target";

type Company = {
  id: string;
  name: string;
  group: Presence;
  country: string;
  sector: string;
  presence: string;
  whatTheyDo: string;
  aqAngle: string;
  withCityAir: string;
  withAqmX: string;
  priority: "A" | "B" | "C";
  contact: string;
  website: string;
  source: string;
};

type ExpoData = {
  event: {
    name: string;
    shortName: string;
    coEvent: string;
    edition: string;
    start: string;
    end: string;
    venue: string;
    address: string;
    halls: string;
    city: string;
    country: string;
    organizer: string;
    organizerSite: string;
    officialSite: string;
    smartexSite: string;
    scale: { label: string; value: string }[];
    themes: string[];
    coLocated: string[];
    whyItMatters: string;
    sources: { label: string; url: string }[];
  };
  cooperationModels: { id: string; title: string; forUs: string; forAqmX: string; ask: string; give: string }[];
  companies: Company[];
  orgReferrals: { label: string; note: string; url: string }[];
  templates: { lang: string; label: string; body: string }[];
  outreachChecklist: string[];
};

const data = expoJson as unknown as ExpoData;
const { event } = data;

const priorityTone: Record<string, "rose" | "sun" | "slate"> = {
  A: "rose",
  B: "sun",
  C: "slate",
};
const priorityLabel: Record<string, string> = {
  A: "A · Priority",
  B: "B · Strong",
  C: "C · Opportunistic",
};

function fairStatus() {
  const now = new Date();
  const start = new Date(`${event.start}T08:00:00+03:00`);
  const end = new Date(`${event.end}T20:00:00+03:00`);
  const day = Math.min(4, Math.max(1, Math.floor((now.getTime() - start.getTime()) / 86_400_000) + 1));
  if (now >= start && now <= end) return { live: true, day, label: `LIVE now · day ${day} of 4` };
  if (now < start) {
    const days = Math.ceil((start.getTime() - now.getTime()) / 86_400_000);
    return { live: false, day: 0, label: `opens in ${days} day${days === 1 ? "" : "s"}` };
  }
  return { live: false, day: 0, label: "edition closed — next edition 29 Sep – 2 Oct 2027" };
}

function downloadFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Company[]): string {
  const head = [
    "Company",
    "Type",
    "Country",
    "Sector",
    "Presence / verification",
    "What they do",
    "Air-quality angle",
    "Cooperation with CityAir",
    "Cooperation with AQMx",
    "Priority",
    "Contact route",
    "Website",
    "Source",
  ];
  const esc = (value: string) => `"${(value ?? "").replace(/"/g, '""')}"`;
  return [
    head.join(","),
    ...rows.map((c) =>
      [
        c.name,
        c.group === "exhibitor" ? "Exhibitor / at the fair" : "Ecosystem target",
        c.country,
        c.sector,
        c.presence,
        c.whatTheyDo,
        c.aqAngle,
        c.withCityAir,
        c.withAqmX,
        c.priority,
        c.contact,
        c.website,
        c.source,
      ]
        .map(esc)
        .join(","),
    ),
  ].join("\n");
}

function OrgStrip() {
  return (
    <Card>
      <SectionTitle
        eyebrow="Organisations referenced"
        title="Who is on this page, and in what capacity"
        description="CityAir works with a neutral wordmark for each organisation it references. Official logos are not reproduced here: they are added only with written permission from the organisation, so nobody can read this page as a partnership that does not exist."
      />
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.orgReferrals.map((org) => (
          <li key={org.label}>
            <a
              href={org.url}
              target="_blank"
              rel="noreferrer"
              className="flex h-full items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-950 text-[10px] font-extrabold leading-tight text-white">
                {org.label.slice(0, 6)}
              </span>
              <span>
                <span className="flex items-center gap-1 font-semibold text-brand-950">
                  {org.label} <IconExternal size={12} />
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-500">{org.note}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-5 rounded-xl bg-sun-50 p-4 text-xs leading-6 text-sun-800">
        <strong>Note on logos:</strong> AQMx, WHO, CCAC, WRI, NASA, XPRIZE and the fair's organisers
        are independent organisations. CityAir is not affiliated with any of them. If you hold the
        rights and want your logo displayed on this page, send written permission and we will place
        the official asset — until then the chips above are text references only.
      </p>
    </Card>
  );
}

function CompanyRow({ company }: { company: Company }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className={cn("border-t border-slate-200 align-top", open && "bg-brand-50/40")}>
        <td className="px-3 py-3">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-left font-semibold text-brand-900 hover:underline"
            aria-expanded={open}
          >
            {company.name}
          </button>
          <p className="mt-0.5 text-xs text-slate-500">
            {company.country} · {company.sector}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {company.group === "exhibitor" ? "At the fair (published list)" : "Ecosystem target"}
          </p>
        </td>
        <td className="px-3 py-3 text-xs leading-5 text-slate-600">{company.aqAngle}</td>
        <td className="hidden px-3 py-3 text-xs leading-5 text-slate-600 lg:table-cell">
          {company.withCityAir}
        </td>
        <td className="hidden px-3 py-3 text-xs leading-5 text-slate-600 xl:table-cell">
          {company.withAqmX}
        </td>
        <td className="px-3 py-3">
          <Badge tone={priorityTone[company.priority]}>{priorityLabel[company.priority]}</Badge>
        </td>
        <td className="px-3 py-3">
          <button
            className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-brand-800 hover:border-brand-400"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Details"}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-brand-100 bg-brand-50/40">
          <td colSpan={6} className="px-3 py-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="eyebrow text-accent-600">What they do</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{company.whatTheyDo}</p>
                <p className="eyebrow mt-4 text-accent-600">Verification</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{company.presence}</p>
              </div>
              <div>
                <p className="eyebrow text-accent-600">Cooperation with CityAir</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{company.withCityAir}</p>
                <p className="eyebrow mt-4 text-accent-600">Route in</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{company.contact}</p>
              </div>
              <div>
                <p className="eyebrow text-accent-600">Pathway to the AQMx exchange</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{company.withAqmX}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {company.website && (
                    <Button href={company.website} target="_blank" size="sm" variant="outline">
                      Website <IconExternal size={12} />
                    </Button>
                  )}
                  {company.source && (
                    <Button href={company.source} target="_blank" size="sm" variant="ghost">
                      Directory source
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function Expo() {
  const status = useMemo(fairStatus, []);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<"all" | Presence>("all");
  const [priority, setPriority] = useState("");
  const [sector, setSector] = useState("");
  const [sort, setSort] = useState<"priority" | "name">("priority");
  const [copied, setCopied] = useState("");

  const sectors = useMemo(
    () => Array.from(new Set(data.companies.map((c) => c.sector))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = data.companies.filter((c) => {
      const matchesQuery =
        !q ||
        [c.name, c.sector, c.country, c.aqAngle, c.withCityAir, c.withAqmX, c.whatTheyDo]
          .join(" ")
          .toLowerCase()
          .includes(q);
      return (
        matchesQuery &&
        (group === "all" || c.group === group) &&
        (!priority || c.priority === priority) &&
        (!sector || c.sector === sector)
      );
    });
    return list.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : a.priority.localeCompare(b.priority) || a.name.localeCompare(b.name),
    );
  }, [query, group, priority, sector, sort]);

  const counts = {
    all: data.companies.length,
    exhibitor: data.companies.filter((c) => c.group === "exhibitor").length,
    target: data.companies.filter((c) => c.group === "target").length,
    a: data.companies.filter((c) => c.priority === "A").length,
  };

  const copy = async (label: string, body: string) => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(label);
      setTimeout(() => setCopied(""), 2200);
    } catch {
      setCopied("clipboard blocked by the browser");
      setTimeout(() => setCopied(""), 2200);
    }
  };

  return (
    <>
      <PageHero
        eyebrow={`Istanbul · ${status.label}`}
        title="ISAF Smartex 2026 — cooperation brief for smart-city and air-quality companies"
        description="The 15th International Smart Cities, Buildings, Transport, Management & Living Fair runs at İstanbul Fuar Merkezi (Yeşilköy), 7–10 October 2026, co-located with ISAF International, MOBISAD IMEX, Data Center Eurasia, LANDSCAPE Istanbul and PetZoo Eurasia. This page is CityAir's working document for the fair: who is there, what we can do with them, and exactly what we ask for."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#/expo#companies" variant="primary">
            Jump to the company table
          </Button>
          <Button
            variant="outline"
            className="bg-white/95"
            onClick={() => downloadFile("cityair-smartex-2026-companies.csv", toCsv(filtered), "text/csv")}
          >
            Download the table (CSV)
          </Button>
          <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => window.print()}>
            Print / PDF one-pager
          </Button>
        </div>
      </PageHero>

      {/* Event facts */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-10">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={status.live ? "leaf" : "slate"}>{status.label}</Badge>
                <Badge tone="accent">{event.edition}</Badge>
                <Badge tone="brand">{event.city}</Badge>
              </div>
              <h2 className="mt-4 text-xl font-extrabold text-brand-950">{event.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{event.coEvent}</p>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</dt>
                  <dd className="mt-1 font-semibold text-brand-950">
                    7–10 October 2026 (Wed–Sat)
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Venue</dt>
                  <dd className="mt-1 font-semibold text-brand-950">{event.venue}</dd>
                  <dd className="mt-0.5 text-xs text-slate-500">{event.address}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Organiser
                  </dt>
                  <dd className="mt-1 font-semibold text-brand-950">{event.organizer}</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Halls</dt>
                  <dd className="mt-1 text-sm text-brand-900">{event.halls}</dd>
                </div>
              </dl>
              <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-slate-700">
                <strong className="text-brand-900">Why CityAir is at this fair: </strong>
                {event.whyItMatters}
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <h3 className="font-bold text-brand-950">Scale (as published)</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {event.scale.map((item) => (
                    <li key={item.label} className="flex items-start justify-between gap-3">
                      <span className="text-slate-600">{item.label}</span>
                      <span className="text-right font-semibold text-brand-900">{item.value}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="font-bold text-brand-950">Thematic tracks</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {event.themes.map((theme) => (
                    <span
                      key={theme}
                      className="rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-800"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </Card>
              <Card>
                <h3 className="font-bold text-brand-950">Co-located fairs under one ticket</h3>
                <div className="mt-3">
                  <Bullets items={event.coLocated} />
                </div>
              </Card>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-brand-200 bg-white p-4 text-xs leading-6 text-slate-600">
            <strong className="text-brand-900">How this page was compiled: </strong>
            facts come from the organiser's own site and public fair directories (
            {event.sources.map((source, i) => (
              <span key={source.url}>
                {i > 0 && " · "}
                <a className="font-semibold text-brand-700 underline" href={source.url} target="_blank" rel="noreferrer">
                  {source.label}
                </a>
              </span>
            ))}
            ). Directories publish only part of the exhibitor list, and hall/stand numbers change on
            site — so every company below is labelled either <strong>“At the fair”</strong> (found in a
            published exhibitor directory) or <strong>“Ecosystem target”</strong> (a company we
            intend to approach, whose presence you must confirm at the venue). Nothing in this table
            is a claim of an existing partnership.
          </div>
        </div>
      </section>

      {/* Cooperation models */}
      <section className="container-page py-12">
        <SectionTitle
          eyebrow="Cooperation framework"
          title="Six ways a company can work with CityAir — and with the AQMx exchange"
          description="Each model states what we do, what we ask for, what we give, and how the same work could reach the global AQMx exchange. The AQMx pathways are suggestions, subject to AQMx's own acceptance — CityAir cannot commit on their behalf."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {data.cooperationModels.map((model) => (
            <Card key={model.id} as="article" className="flex h-full flex-col">
              <h3 className="font-bold text-brand-950">{model.title}</h3>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  <strong className="text-brand-800">With CityAir: </strong>
                  {model.forUs}
                </p>
                <p className="rounded-xl bg-brand-50 p-3">
                  <strong className="text-brand-800">With AQMx: </strong>
                  {model.forAqmX}
                </p>
              </div>
              <div className="mt-auto grid gap-2 pt-4 text-xs">
                <p className="rounded-lg bg-slate-50 px-3 py-2">
                  <strong>We ask:</strong> {model.ask}
                </p>
                <p className="rounded-lg bg-leaf-50 px-3 py-2">
                  <strong>We give:</strong> {model.give}
                </p>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Disclaimer>
            The AQMx column describes how a company <em>could</em> contribute to the AQMx knowledge
            exchange. CityAir is an independent prototype, is not an AQMx product, and has no
            authority to approve, list or speak for AQMx. Any listing there is decided by AQMx
            alone.
          </Disclaimer>
        </div>
      </section>

      {/* Company table */}
      <section id="companies" className="border-y border-slate-200 bg-slate-50 py-12">
        <div className="container-page">
          <SectionTitle
            eyebrow="Company table"
            title={`${counts.all} companies mapped — ${counts.exhibitor} found in published exhibitor lists, ${counts.target} ecosystem targets`}
            description="Filter, open a row for the full brief, and export the table as CSV for your booth walk. Priority A means the fastest route to a published, useful result; C means opportunistic."
          />

          <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <IconSearch className="absolute left-3 top-3.5 text-slate-400" size={18} />
              <input
                className={`${inputCls} pl-10`}
                placeholder="Search company, sector, air-quality angle…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search companies"
              />
            </div>
            <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as typeof group)} aria-label="Filter by type">
              <option value="all">All types ({counts.all})</option>
              <option value="exhibitor">At the fair ({counts.exhibitor})</option>
              <option value="target">Ecosystem targets ({counts.target})</option>
            </select>
            <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority">
              <option value="">All priorities</option>
              <option value="A">A · Priority ({counts.a})</option>
              <option value="B">B · Strong</option>
              <option value="C">C · Opportunistic</option>
            </select>
            <select className={inputCls} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort">
              <option value="priority">Sort by priority</option>
              <option value="name">Sort by name</option>
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>{filtered.length} of {counts.all} shown</span>
            <select
              className="rounded-lg border border-slate-300 bg-white px-2 py-1"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              aria-label="Filter by sector"
            >
              <option value="">All sectors</option>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadFile("cityair-smartex-2026-companies.csv", toCsv(filtered), "text/csv")}
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => downloadFile("cityair-smartex-2026-companies.json", JSON.stringify(filtered, null, 2), "application/json")}
            >
              Export JSON
            </Button>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-brand-950 text-white">
                <tr>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide">Company</th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide">Air-quality angle</th>
                  <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-wide lg:table-cell">
                    Cooperation with CityAir
                  </th>
                  <th className="hidden px-3 py-3 text-xs font-bold uppercase tracking-wide xl:table-cell">
                    Cooperation with AQMx
                  </th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide">Priority</th>
                  <th className="px-3 py-3 text-xs font-bold uppercase tracking-wide">Brief</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <CompanyRow key={company.id} company={company} />
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length === 0 && (
            <Card className="mt-4 text-center text-sm text-slate-600">
              No company matches those filters — clear the search or pick another sector.
            </Card>
          )}
        </div>
      </section>

      {/* Outreach kit */}
      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <Card>
            <SectionTitle
              eyebrow="Booth script"
              title="What to say, what to ask, what to promise"
              description="Three languages, twenty seconds each. Copy, paste, adapt. The script deliberately offers evidence rather than equipment — that is what makes a vendor listen."
            />
            <div className="mt-6 space-y-4">
              {data.templates.map((template) => (
                <div key={template.label} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-bold text-brand-950">{template.label}</p>
                    <button
                      onClick={() => copy(template.label, template.body)}
                      className="rounded-lg border border-brand-200 px-3 py-1 text-[11px] font-semibold text-brand-800 hover:border-brand-400"
                    >
                      {copied === template.label ? (
                        <span className="inline-flex items-center gap-1">
                          <IconCheck size={12} /> copied
                        </span>
                      ) : (
                        "Copy"
                      )}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {template.body}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <SectionTitle eyebrow="Field discipline" title="Fair checklist" />
              <ol className="mt-5 space-y-2 text-sm text-slate-600">
                {data.outreachChecklist.map((item, i) => (
                  <li key={item} className="flex gap-3 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-100 text-[10px] font-bold text-accent-800">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </Card>

            <Card>
              <SectionTitle eyebrow="Tracker" title="Print this and fill it at the stand" />
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[420px] text-left text-xs">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 pb-2">Company / stand</th>
                      <th className="border-b border-slate-200 pb-2">Contact name</th>
                      <th className="border-b border-slate-200 pb-2">Ask agreed</th>
                      <th className="border-b border-slate-200 pb-2">Follow-up date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <tr key={i}>
                        <td className="h-8 border-b border-slate-100" />
                        <td className="h-8 border-b border-slate-100" />
                        <td className="h-8 border-b border-slate-100" />
                        <td className="h-8 border-b border-slate-100" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button className="mt-4" size="sm" variant="outline" onClick={() => window.print()}>
                Print the tracker
              </Button>
            </Card>
          </div>
        </div>
      </section>

      <section className="container-page pb-16">
        <OrgStrip />

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle
              eyebrow="Calls to action"
              title="Three commitments we can sign at the fair"
              description="Short enough to agree in a fifteen-minute meeting, concrete enough to survive the week."
            />
            <ol className="mt-5 space-y-3 text-sm">
              {[
                "One pilot: a company supplies hardware or connectivity for one district, CityAir publishes the baseline, method and six-month result.",
                "One brief: a company submits one product and one limitation; CityAir co-authors the implementation brief and publishes it with attribution.",
                "One evaluation: a company funds an independent before/after evaluation and accepts publication of the result, whatever it shows.",
              ].map((commitment, i) => (
                <li key={commitment} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="text-slate-700">{commitment}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href="#/assess">Assess a city before you walk the hall</Button>
              <Button href="#/innovation-match" variant="outline">
                See how matching works
              </Button>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Sources & honesty" title="What this page is not" />
            <div className="mt-4">
              <Bullets
                items={[
                  "It is not an official ISAF Smartex or İFM document, and it is not endorsed by the organiser.",
                  "It is not a confirmed exhibitor list: public directories publish only a part of it, and stands move. Verify every company at the venue.",
                  "It is not a partnership announcement. The column “cooperation with CityAir/AQMx” describes proposed models, not signed agreements.",
                  "It is not a vendor ranking and must not be used as a procurement shortlist without your own due diligence.",
                ]}
              />
            </div>
            <div className="mt-5">
              <Disclaimer>
                Company names are used to identify organisations for a possible conversation. No
                organisation listed here has endorsed CityAir, and CityAir has no authority to speak
                for AQMx or any other organisation named on this page.
              </Disclaimer>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
