import { useEffect, useMemo, useState } from "react";
import { innovations } from "@/lib/data";
import { calculateResult, loadAssessment } from "@/lib/assessment";
import type { AssessmentResult, AssessmentState, Innovation } from "@/lib/types";
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
import { IconSearch, IconSpark } from "@/components/icons";

function scoreMatch(
  innovation: Innovation,
  state: AssessmentState,
  bandLevel: number,
): number {
  let score = 0;
  const haystack = [
    innovation.sector,
    innovation.problem,
    innovation.title,
    ...innovation.requiredData,
    ...innovation.steps,
  ]
    .join(" ")
    .toLowerCase();

  for (const priority of state.priorities) {
    const key = priority.toLowerCase().replace(/ emissions| monitoring| communication/g, "");
    if (haystack.includes(key.split(" ")[0])) score += 1.6;
  }
  for (const priority of state.priorities) {
    if (haystack.includes(priority.toLowerCase())) score += 0.8;
  }

  const required = ["Starting", "Developing", "Established", "Advanced", "Leading"].indexOf(
    innovation.requiredCapacity,
  );
  if (bandLevel >= required) score += 1.4;
  else score -= (required - bandLevel) * 0.6;

  const citySectors = state.city.sectors.toLowerCase();
  if (citySectors && haystack.includes(citySectors.split(/[,;]/)[0].trim())) score += 0.9;

  if (state.city.concerns && haystack.includes(state.city.concerns.split(" ")[0].toLowerCase()))
    score += 0.4;

  return Math.round(score * 10) / 10;
}

export function InnovationMatch() {
  const [state, setState] = useState<AssessmentState | null>(null);

  useEffect(() => setState(loadAssessment()), []);

  const result: AssessmentResult | null = useMemo(
    () => (state ? calculateResult(state) : null),
    [state],
  );

  const ranked = useMemo(() => {
    if (!state || !result) return [];
    const bandLevel = ["Starting", "Developing", "Established", "Advanced", "Leading"].indexOf(
      result.band,
    );
    return innovations
      .map((innovation) => ({ innovation, fit: scoreMatch(innovation, state, bandLevel) }))
      .sort((a, b) => b.fit - a.fit);
  }, [state, result]);

  if (!state || !result) {
    return (
      <div className="container-page py-20">
        <Card className="text-center text-sm text-slate-600">Loading…</Card>
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Explainable recommendation"
        title="Innovation matching against your recorded context"
        description="Matches use your stated priorities, city context, readiness band and the capacity each innovation demands. They are starting points for feasibility review — never endorsements."
      >
        {result.completed > 0 && (
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent-200">
            <IconSpark size={14} /> Matching against {state.city.name || "your city"} ·{" "}
            {result.band} · score {result.score}
          </p>
        )}
      </PageHero>

      <section className="container-page py-12">
        {result.completed === 0 ? (
          <Card className="text-center">
            <h2 className="text-xl font-bold text-brand-950">
              Complete an assessment for tailored matches
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Until then, the full innovation library remains available for open exploration.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button href="#/assess">Start the assessment</Button>
              <Button href="#/innovations" variant="outline">
                Browse all briefs
              </Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="rounded-2xl bg-brand-950 p-6 text-white">
              <p className="eyebrow text-accent-300">Matching context</p>
              <h2 className="mt-2 text-2xl font-extrabold">
                {state.city.name || "Unnamed city"} · {result.band}
              </h2>
              <p className="mt-2 text-sm text-brand-100">
                Priorities: {state.priorities.join(" · ") || "none recorded"}
              </p>
              <p className="mt-1 text-sm text-brand-100">
                Sectors: {state.city.sectors || "not provided"} · Context:{" "}
                {state.city.context || "not provided"}
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {ranked.map(({ innovation, fit }, index) => (
                <Card key={innovation.id} as="article" className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <p className="eyebrow text-brand-500">
                      Match {index + 1} · {innovation.sector}
                    </p>
                    <Badge
                      tone={fit > 4 ? "leaf" : fit > 1.5 ? "sun" : "slate"}
                    >
                      {fit > 4 ? "strong signal" : fit > 1.5 ? "possible fit" : "explore cautiously"}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-lg font-extrabold text-brand-950">
                    {innovation.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{innovation.problem}</p>
                  <div className="mt-3 rounded-xl bg-brand-50 p-4 text-sm leading-6 text-brand-900">
                    <strong>Why recommended:</strong> it relates to {innovation.sector.toLowerCase()}, requires{" "}
                    {innovation.requiredCapacity.toLowerCase()} capacity (your band is{" "}
                    {result.band.toLowerCase()}), and overlaps your stated priorities or sector
                    context. Fit score {fit}. The match is heuristic and needs local review.
                  </div>
                  <p className="mt-4 text-xs text-slate-500">
                    <strong className="text-slate-600">Required data:</strong>{" "}
                    {innovation.requiredData.join(" · ")}
                  </p>
                  <div className="mt-auto pt-4">
                    <Button href={`#/innovations#${innovation.id}`} size="sm" variant="outline">
                      Review the full brief →
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}

export default function Innovations() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [openId, setOpenId] = useState<string | null>(() =>
    window.location.hash.includes("#", 2) ? window.location.hash.split("#").pop()! : null,
  );

  const sectors = useMemo(
    () => Array.from(new Set(innovations.map((i) => i.sector))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return innovations.filter((innovation) => {
      const matchesQuery =
        !q ||
        [
          innovation.title,
          innovation.problem,
          innovation.benefits,
          innovation.sector,
          ...innovation.requiredData,
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesSector = !sector || innovation.sector === sector;
      return matchesQuery && matchesSector;
    });
  }, [query, sector]);

  return (
    <>
      <PageHero
        eyebrow="Implementation library"
        title="Innovations described honestly enough to assess"
        description="Every brief states the problem addressed, the capacity it requires, the data it depends on, delivery steps, risks, adaptation notes and indicators for monitoring. Status labels make clear what is demonstrated and what is not."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#/innovation-match" variant="primary">
            Match to my assessment
          </Button>
          <Button href="#/assistant" variant="outline" className="bg-white/95">
            Ask about a brief
          </Button>
        </div>
      </PageHero>

      <section className="container-page py-10">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[2fr_1fr]">
          <div className="relative">
            <IconSearch className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              className={`${inputCls} pl-10`}
              placeholder="Search problem, benefit or required data…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search innovations"
            />
          </div>
          <select
            className={inputCls}
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
        </div>

        <p className="mt-6 text-sm text-slate-500">
          {filtered.length} of {innovations.length} briefs
        </p>

        <div className="mt-4 space-y-4">
          {filtered.map((innovation, i) => {
            const open = openId === innovation.id;
            return (
              <article
                key={innovation.id}
                id={innovation.id}
                data-reveal
                style={{ transitionDelay: `${Math.min(i, 6) * 40}ms` }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{innovation.sector}</Badge>
                      <Badge tone="slate">Requires: {innovation.requiredCapacity}</Badge>
                      <Badge tone="sun">{innovation.region}</Badge>
                    </div>
                    <h2 className="mt-3 text-xl font-extrabold text-brand-950">
                      {innovation.title}
                    </h2>
                    <p className="mt-2 leading-7 text-slate-600">{innovation.problem}</p>
                    <p className="mt-2 text-sm text-slate-500">{innovation.status}</p>
                  </div>
                  <Button
                    variant={open ? "dark" : "outline"}
                    size="sm"
                    onClick={() => setOpenId(open ? null : innovation.id)}
                    aria-expanded={open}
                  >
                    {open ? "Hide brief" : "Open brief"}
                  </Button>
                </div>

                {open && (
                  <div className="border-t border-slate-200 bg-slate-50 p-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Expected benefits
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {innovation.benefits}
                        </p>
                        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-700">
                          Required data
                        </h3>
                        <div className="mt-3">
                          <Bullets items={innovation.requiredData} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Delivery steps
                        </h3>
                        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                          {innovation.steps.map((step, index) => (
                            <li key={step} className="flex gap-3">
                              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                                {index + 1}
                              </span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Risks to manage
                        </h3>
                        <div className="mt-3">
                          <Bullets items={innovation.risks} />
                        </div>
                        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-brand-700">
                          Monitoring indicators
                        </h3>
                        <div className="mt-3">
                          <Bullets items={innovation.indicators} tone="leaf" />
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "mt-6 rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm leading-6 text-brand-900",
                      )}
                    >
                      <strong>Adaptation note: </strong>
                      {innovation.adaptation}
                    </div>

                    <p className="mt-4 text-xs text-slate-500">
                      Source: {innovation.source}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <Card className="mt-8 text-center text-sm text-slate-600">
            No brief matches those filters yet.
          </Card>
        )}

        <div className="mt-10">
          <SectionTitle
            eyebrow="Responsible innovation review"
            title="Five questions before adopting anything"
            description="Innovation briefs are invitation to review, not procurement advice. Screen every option against local law, competence, maintenance capacity and social impact."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Does it answer a real decision?",
                text: "Technology that produces data nobody is mandated to act on will not improve air quality.",
              },
              {
                title: "Can we maintain it for a decade?",
                text: "Calibration, spare parts, connectivity and staff time are the usual failure points.",
              },
              {
                title: "Who could be harmed?",
                text: "Check data protection, exclusion, informal-sector livelihoods and accessibility before scale-up.",
              },
            ].map((item) => (
              <Card key={item.title} as="article">
                <h3 className="font-bold text-brand-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6">
            <Disclaimer>
              Briefs are CityAir's own synthesis compiled from public sources and are labelled
              illustrative where they arise from the prototype's demonstration scenarios. No
              supplier, competition or organisation mentioned is a partner or endorser.
            </Disclaimer>
          </div>
        </div>
      </section>
    </>
  );
}
