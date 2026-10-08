import { useMemo } from "react";
import { cities, guidance, innovations, maturityStages } from "@/lib/data";
import { calculateResult, loadAssessment } from "@/lib/assessment";
import { Bullets, Button, Card, Disclaimer, SectionTitle, Stat } from "@/components/ui";
import { iconList } from "@/components/icons";
import { SITE } from "@/components/layout";
import { ConfidenceDial, ScoreGauge } from "@/components/charts";
import { LiveAqStrip } from "./Cities";
import { useI18n } from "../i18n";

export default function Home() {
  const { t } = useI18n();
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
              {t("home.badge")}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl">
              {t("home.title1")}{" "}
              <span className="bg-gradient-to-r from-accent-300 to-leaf-300 bg-clip-text text-transparent">
                {t("home.title2")}
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-brand-100 md:text-lg">
              {t("home.lede")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="#/assess" variant="primary" size="lg">
                {t("home.ctaAssess")}
              </Button>
              <Button href="#/cities" variant="outline" size="lg" className="bg-white/95">
                {t("home.ctaCities")}
              </Button>
              <Button href="#/assistant" variant="ghost" size="lg" className="text-white hover:bg-white/10">
                {t("home.ctaAssistant")}
              </Button>
            </div>
            <p className="mt-6 max-w-2xl text-xs leading-5 text-brand-300">
              {t("home.disclaimer")}
            </p>
          </div>

          <div className="grid gap-4 self-start">
            <Card className="border-white/15 bg-white/95">
              <div className="flex items-center justify-between">
                <div>
                  <p className="eyebrow text-accent-600">{t("home.saved")}</p>
                  <h2 className="mt-1 text-lg font-extrabold text-brand-950">
                    {result.completed > 0 ? t("home.resumed") : t("home.none")}
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
                    <Button href="#/results">{t("home.viewResults")}</Button>
                    <Button href="#/assess" variant="outline">
                      {t("home.continue")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {t("home.assessIntro")}
                </p>
              )}
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Stat value={guidance.length} label={t("home.statDomains")} tone="accent" />
              <Stat value={innovations.length} label={t("home.statBriefs")} tone="leaf" />
            </div>
            <Card className="border-white/15 bg-white/95">
              <p className="eyebrow text-brand-600">{t("home.askEyebrow")}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("home.askBody")}
              </p>
              <div className="mt-3 flex gap-2">
                <Button href="#/assistant" variant="dark" size="sm">
                  {t("home.openAssistant")}
                </Button>
                <Button href={SITE.botUrl} target="_blank" variant="outline" size="sm">
                  {t("chrome.bot")}
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
              <p className="eyebrow text-accent-600">{t("home.now")}</p>
              <h2 className="mt-1 text-xl font-extrabold text-brand-950">
                {t("home.liveTitle")}
              </h2>
            </div>
            <p className="max-w-md text-xs leading-5 text-slate-500">
              {t("home.liveNote")}
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
          eyebrow={t("home.howEyebrow")}
          title={t("home.howTitle")}
          description={t("home.howDesc")}
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
                {t(`stage.${i + 1}.label`)}
              </p>
              <h3 className="mt-2 font-bold text-brand-950">{t(`stage.${i + 1}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t(`stage.${i + 1}.text`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Guidance preview */}
      <section className="border-y border-slate-200 bg-slate-50 py-16">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow={t("home.guidanceEyebrow")}
              title={t("home.guidanceTitle")}
              description={t("home.guidanceDesc")}
            />
            <Button href="#/guidance" variant="outline">
              {t("home.openGuidance")}
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
                    {t("home.readDomain")}
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
            eyebrow={t("home.citiesEyebrow")}
            title={t("home.citiesTitle")}
            description={t("home.citiesDesc")}
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
              {t("home.allCities", { n: cities.length })}
            </Button>
            <Button href="#/cities" variant="ghost">
              {t("home.compare")}
            </Button>
          </div>
        </div>
        <div data-reveal>
          <SectionTitle
            eyebrow={t("home.innovEyebrow")}
            title={t("home.innovTitle")}
            description={t("home.innovDesc")}
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
                  {t("home.readBrief")}
                </a>
              </Card>
            ))}
          </div>
          <Button className="mt-5" href="#/innovations" variant="outline">
            {t("home.fullLibrary")}
          </Button>
        </div>
      </section>

      {/* WHO guidelines teaser */}
      <section className="border-y border-slate-200 bg-brand-950 py-16 text-white">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-accent-300">{t("home.whoEyebrow")}</p>
            <h2 className="mt-2 text-2xl font-extrabold md:text-3xl">
              {t("home.whoTitle")}
            </h2>
            <p className="mt-4 leading-7 text-brand-100">
              {t("home.whoBody")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="#/methodology" variant="outline" className="bg-white/95">
                {t("home.readMethod")}
              </Button>
              <Button href="#/resources" variant="ghost" className="text-white hover:bg-white/10">
                {t("home.publicResources")}
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-6">
            <h3 className="font-bold text-white">{t("home.whoTable")}</h3>
            <table className="mt-4 w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-brand-300">
                <tr>
                  <th className="pb-2">{t("home.pollutant")}</th>
                  <th className="pb-2">{t("home.averaging")}</th>
                  <th className="pb-2 text-end">{t("home.interim")}</th>
                  <th className="pb-2 text-end">{t("home.aqg")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-brand-100">
                <tr>
                  <td className="py-2">PM₂.₅</td>
                  <td className="py-2">{t("home.annual")}</td>
                  <td className="py-2 text-end font-mono text-xs">35 · 25 · 15 · 10</td>
                  <td className="py-2 text-right font-bold text-white">5</td>
                </tr>
                <tr>
                  <td className="py-2">PM₂.₅</td>
                  <td className="py-2">{t("home.daily")}</td>
                  <td className="py-2 text-end font-mono text-xs">75 · 50 · 37.5 · 25</td>
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
              {t("home.whoFootnote")}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="grid gap-8 rounded-3xl border border-slate-200 bg-slate-50 p-8 lg:grid-cols-[1.4fr_1fr] lg:p-12">
          <div>
            <SectionTitle
              eyebrow={t("home.respEyebrow")}
              title={t("home.respTitle")}
              description={t("home.respDesc")}
            />
            <div className="mt-6">
              <Bullets
                items={[t("home.b1"), t("home.b2"), t("home.b3"), t("home.b4")]}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href="#/about">{t("home.readAbout")}</Button>
              <Button href="#/methodology" variant="outline">
                {t("home.methodLimits")}
              </Button>
            </div>
          </div>
          <Disclaimer>
            <strong className="block">{t("home.independent")}</strong>
            {t("home.independentBody")}
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
