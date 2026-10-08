import { useMemo } from "react";
import { cities, guidance, innovations, maturityStages } from "@/lib/data";
import { calculateResult, loadAssessment } from "@/lib/assessment";
import { Bullets, Button, Card, Disclaimer, SectionTitle, Stat } from "@/components/ui";
import { iconList } from "@/components/icons";
import { SITE } from "@/components/layout";
import { ConfidenceDial, ScoreGauge } from "@/components/charts";
import { LiveAqStrip } from "./Cities";

export default function Home() {
  const result = useMemo(() => calculateResult(loadAssessment()), []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <img
          src="./images/hero-city.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          loading="eager"
        />
        <div className="bg-grid-pattern absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="container-page relative grid gap-12 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent-200">
              Independent air-quality readiness platform
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              Turn fragmented city evidence into{" "}
              <span className="bg-gradient-to-r from-accent-300 to-leaf-300 bg-clip-text text-transparent">
                accountable clean-air action
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-brand-100 md:text-lg">
              CityAir helps city teams diagnose air-quality management capacity across twelve
              domains, identify evidence gaps, build phased action plans, find peer context and
              review innovations for local adaptation — with an AI assistant grounded in the
              platform's own knowledge base.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="#/assess" variant="primary" size="lg">
                Start the readiness assessment
              </Button>
              <Button href="#/cities" variant="outline" size="lg" className="bg-white/95">
                Explore city context
              </Button>
              <Button href="#/assistant" variant="ghost" size="lg" className="text-white hover:bg-white/10">
                Ask the assistant →
              </Button>
            </div>
            <p className="mt-6 max-w-2xl text-xs leading-5 text-brand-300">
              Illustrative demonstration data. City scores shown in this prototype are planning
              prompts, not official rankings, and no organisation named on this site is a confirmed
              partner or endorser.
            </p>
          </div>

          <div className="grid gap-4 self-start">
            <Card className="border-white/15 bg-white/95">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-accent-600">Your saved assessment</p>
                  <h2 className="mt-1 text-lg font-extrabold text-brand-950">
                    {result.completed > 0 ? "Progress resumed" : "No assessment yet"}
                  </h2>
                </div>
                <ScoreGauge value={result.score} band={result.band} size={132} label="" />
              </div>
              {result.completed > 0 ? (
                <>
                  <div className="mt-3">
                    <ConfidenceDial value={result.confidence} />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button href="#/results">View results</Button>
                    <Button href="#/assess" variant="outline">
                      Continue
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Twelve weighted questions across monitoring, attribution, inventories,
                  forecasting, health, waste and governance. Answers are stored in your browser
                  only — nothing is uploaded unless you choose to share it.
                </p>
              )}
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Stat value={guidance.length} label="Guidance domains" tone="accent" />
              <Stat value={innovations.length} label="Implementation briefs" tone="leaf" />
            </div>
            <Card className="border-white/15 bg-white/95">
              <p className="eyebrow text-brand-600">Ask the AI assistant</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Retrieval-grounded answers about the method, guidance, city context and
                innovations — with the sources it used. Available in the corner bubble on every
                page.
              </p>
              <div className="mt-3 flex gap-2">
                <Button href="#/assistant" variant="dark" size="sm">
                  Open the assistant
                </Button>
                <Button href={SITE.botUrl} target="_blank" variant="outline" size="sm">
                  Telegram bot
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Live readings */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-accent-600">Now</p>
              <h2 className="mt-1 text-xl font-extrabold text-brand-950">
                Live air-quality readings
              </h2>
            </div>
            <p className="max-w-md text-xs leading-5 text-slate-500">
              Real-time PM2.5 / PM10 and European AQI from the open Open-Meteo air-quality API.
              These readings are context for the assessment — they are not quality-assured
              regulatory measurements.
            </p>
          </div>
          <div className="mt-5">
            <LiveAqStrip />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16">
        <SectionTitle
          eyebrow="How CityAir works"
          title="Five stages from diagnosis to durable improvement"
          description="The method follows the logic used by established air-quality management frameworks: frame the mandate, build trustworthy evidence, attribute sources, act on priorities, then sustain and communicate."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {maturityStages.map((stage, i) => (
            <li
              key={stage.stage}
              data-reveal
              className="rounded-2xl border border-slate-200 bg-white p-5"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-accent-600">
                {stage.stage}
              </p>
              <h3 className="mt-2 font-bold text-brand-950">{stage.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{stage.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Guidance preview */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Sectoral guidance"
              title="Twelve domains that decide whether clean-air plans work"
              description="Each domain carries guiding questions, recommended actions, the data it needs, maturity markers and public references."
            />
            <Button href="#/guidance" variant="outline">
              Open all guidance
            </Button>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guidance.slice(0, 6).map((domain, i) => {
              const Icon = iconList[["air", "chart", "map", "layers", "shield", "globe"][i % 6]];
              return (
                <Card key={domain.slug} className="h-full" as="article">
                  <Icon className="text-accent-600" size={22} />
                  <h3 className="mt-3 font-bold text-brand-950">{domain.category}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{domain.summary}</p>
                  <a
                    className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline"
                    href={`#/guidance?d=${domain.slug}`}
                  >
                    Read the domain brief →
                  </a>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cities + innovations */}
      <section className="container-page grid gap-10 py-16 lg:grid-cols-2">
        <div data-reveal>
          <SectionTitle
            eyebrow="City explorer"
            title="Compare context, capacity and exposure"
            description="Profiles summarise sector mix, climate context, documented challenges and capacity scores across the same twelve domains used in the assessment."
          />
          <ul className="mt-6 space-y-2">
            {cities.slice(0, 5).map((city) => (
              <li key={city.id}>
                <a
                  href={`#/cities/${city.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-300"
                >
                  <span>
                    <span className="font-semibold text-brand-950">{city.name}</span>
                    <span className="ml-2 text-xs text-slate-500">{city.country}</span>
                  </span>
                  <span className="text-sm font-bold text-brand-700">{city.score}</span>
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex gap-2">
            <Button href="#/cities" variant="outline">
              All {cities.length} cities
            </Button>
            <Button href="#/cities" variant="ghost">
              Compare up to three →
            </Button>
          </div>
        </div>
        <div data-reveal>
          <SectionTitle
            eyebrow="Innovation exchange"
            title="Implementation briefs, not hype"
            description="Each brief states the problem addressed, the capacity it requires, the data it depends on, delivery steps, risks, adaptation notes and monitoring indicators."
          />
          <div className="mt-6 space-y-3">
            {innovations.slice(0, 3).map((innovation) => (
              <Card key={innovation.id} as="article">
                <p className="eyebrow text-brand-500">{innovation.sector}</p>
                <h3 className="mt-1 font-bold text-brand-950">{innovation.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{innovation.problem}</p>
                <a
                  className="mt-3 inline-block text-sm font-bold text-brand-700 hover:underline"
                  href={`#/innovations#${innovation.id}`}
                >
                  Read the brief →
                </a>
              </Card>
            ))}
          </div>
          <Button className="mt-5" href="#/innovations" variant="outline">
            Full library & matching
          </Button>
        </div>
      </section>

      {/* WHO guidelines teaser */}
      <section className="border-y border-slate-200 bg-brand-950 py-16 text-white">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-accent-300">Benchmarks</p>
            <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">
              What "clean enough" means is defined by guideline values — not by opinion
            </h2>
            <p className="mt-4 leading-7 text-brand-100">
              The methodology page documents how the readiness score is computed, how evidence
              confidence is weighted, which limits apply and how the platform handles correction
              requests. It also lists the WHO global air-quality guideline levels used as reference
              benchmarks.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="#/methodology" variant="outline" className="bg-white/95">
                Read the methodology
              </Button>
              <Button href="#/resources" variant="ghost" className="text-white hover:bg-white/10">
                Public resources →
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h3 className="font-bold text-white">WHO guideline levels (selected)</h3>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-brand-300">
                <tr>
                  <th className="pb-2">Pollutant</th>
                  <th className="pb-2">Averaging</th>
                  <th className="pb-2 text-right">Interim targets</th>
                  <th className="pb-2 text-right">AQG level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-brand-100">
                <tr>
                  <td className="py-2">PM₂.₅</td>
                  <td className="py-2">Annual</td>
                  <td className="py-2 text-right font-mono text-xs">35 · 25 · 15 · 10</td>
                  <td className="py-2 text-right font-bold text-white">5</td>
                </tr>
                <tr>
                  <td className="py-2">PM₂.₅</td>
                  <td className="py-2">24-hour</td>
                  <td className="py-2 text-right font-mono text-xs">75 · 50 · 37.5 · 25</td>
                  <td className="py-2 text-right font-bold text-white">15</td>
                </tr>
                <tr>
                  <td className="py-2">PM₁₀</td>
                  <td className="py-2">Annual</td>
                  <td className="py-2 text-right font-mono text-xs">70 · 50 · 30 · 20</td>
                  <td className="py-2 text-right font-bold text-white">15</td>
                </tr>
                <tr>
                  <td className="py-2">NO₂</td>
                  <td className="py-2">Annual</td>
                  <td className="py-2 text-right font-mono text-xs">40 · 30 · 20</td>
                  <td className="py-2 text-right font-bold text-white">10</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-3 text-xs text-brand-300">
              Values in µg/m³ for annual and 24-hour averaging, as published in the WHO global
              air-quality guidelines. Confirm current values with the source before use.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="grid gap-8 rounded-3xl border border-slate-200 bg-slate-50 p-8 lg:grid-cols-[1.4fr_1fr] lg:p-12">
          <div>
            <SectionTitle
              eyebrow="Responsible use"
              title="A planning instrument — with the limits stated up front"
              description="CityAir is a prototype. It does not certify, rank or audit cities, it does not replace regulatory measurement networks, and it must not be used to claim verified emission reductions."
            />
            <div className="mt-6">
              <Bullets
                items={[
                  "Demonstration city data and scores are illustrative and must be replaced with documented local evidence.",
                  "Answers and progress stay in your browser unless you explicitly export or share them.",
                  "AI assistant answers are generated from the platform knowledge base and can be incomplete — always verify against the cited source.",
                  "No organisation named on this site is a confirmed partner, funder or endorser.",
                ]}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="#/about">Read about the initiative</Button>
              <Button href="#/methodology" variant="outline">
                Method, limits & governance
              </Button>
            </div>
          </div>
          <Disclaimer>
            <strong className="block">Independent prototype</strong>
            This GreenHope/CityAir prototype is inspired by publicly available air-quality
            management frameworks, including AQMx. It is not an official AQMx, CCAC, WRI, NASA or
            XPRIZE product, and names of organisations are used only to point to public resources.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
