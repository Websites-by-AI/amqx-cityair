import { useEffect, useMemo, useState } from "react";
import { cities, regionOptions } from "@/lib/data";
import { aqiBand, getLiveReading } from "@/lib/api";
import type { City, LiveReading } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Disclaimer,
  PageHero,
  SectionTitle,
  cn,
  inputCls,
} from "@/components/ui";
import { CategoryBars, GroupedBars, Radar, ScoreGauge } from "@/components/charts";
import { IconSearch } from "@/components/icons";

const DEMO_NOTE =
  "Illustrative CityAir demonstration data — scores are planning prompts, not official rankings.";

/** Live readings strip (Open-Meteo, no key required). */
export function LiveAqStrip({ limit = 6 }: { limit?: number }) {
  const [readings, setReadings] = useState<Record<string, LiveReading | null>>({});
  const [loading, setLoading] = useState(true);

  const sample = useMemo(() => {
    const preferred = ["istanbul", "tehran", "delhi", "mexico-city", "nairobi", "krakow"];
    const picked = cities.filter((c) => preferred.includes(c.id));
    return (picked.length ? picked : cities).slice(0, limit);
  }, [limit]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(
      sample.map(async (city) => {
        const reading = await getLiveReading(city.name, city.lat, city.lon, controller.signal);
        return [city.id, reading] as const;
      }),
    )
      .then((entries) => setReadings(Object.fromEntries(entries)))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [sample]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {sample.map((city) => {
        const reading = readings[city.id];
        const band = aqiBand(reading?.europeanAqi ?? null);
        return (
          <div
            key={city.id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-brand-950">{city.name}</p>
                <p className="text-[11px] text-slate-500">{city.country}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", band.tone)}>
                {loading && !reading ? "…" : band.label}
              </span>
            </div>
            <p className="mt-3 text-2xl font-extrabold text-brand-800">
              {reading?.europeanAqi ?? "—"}
              <span className="ml-1 text-xs font-semibold text-slate-400">EAQI</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              PM₂.₅ {reading?.pm25 ?? "—"} · PM₁₀ {reading?.pm10 ?? "—"} µg/m³
            </p>
            <p className="mt-1 text-[10px] text-slate-400">
              {reading?.time ? new Date(reading.time).toUTCString() : "source unavailable"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function CityCard({ city, onCompare, compared }: { city: City; onCompare: () => void; compared: boolean }) {
  return (
    <Card as="article" className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-brand-950">{city.name}</h3>
          <p className="text-sm text-slate-500">
            {city.country} · {city.region}
          </p>
        </div>
        <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
          {city.score}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        <Badge tone="brand">{city.band}</Badge>
        <Badge tone="slate">{city.population}</Badge>
        <Badge tone="accent">{city.sector}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{city.climate}</p>
      <ul className="mt-3 space-y-1 text-xs text-slate-600">
        {city.challenges.slice(0, 3).map((challenge) => (
          <li key={challenge}>· {challenge}</li>
        ))}
      </ul>
      <div className="mt-auto flex gap-2 pt-4">
        <Button href={`#/cities/${city.id}`} size="sm">
          Profile
        </Button>
        <Button size="sm" variant={compared ? "dark" : "outline"} onClick={onCompare}>
          {compared ? "In comparison" : "Compare"}
        </Button>
      </div>
    </Card>
  );
}

export function CityDetail({ id }: { id: string }) {
  const city = cities.find((c) => c.id === id);
  const [reading, setReading] = useState<LiveReading | null>(null);

  useEffect(() => {
    if (!city) return;
    const controller = new AbortController();
    getLiveReading(city.name, city.lat, city.lon, controller.signal).then(setReading);
    return () => controller.abort();
  }, [city]);

  if (!city) {
    return (
      <div className="container-page py-20">
        <Card className="text-center">
          <h1 className="text-xl font-bold text-brand-950">City not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            The profile you requested is not in the illustrative library.
          </p>
          <div className="mt-4 flex justify-center">
            <Button href="#/cities">Back to the city explorer</Button>
          </div>
        </Card>
      </div>
    );
  }

  const axes = Object.entries(city.scores).map(([label, value]) => ({ label, value }));
  const band = aqiBand(reading?.europeanAqi ?? null);

  return (
    <>
      <PageHero
        eyebrow={`${city.region} · ${city.population}`}
        title={`${city.name}, ${city.country}`}
        description={`${city.climate}. Dominant sector of concern: ${city.sector}. Profile values are illustrative demonstration data used to exercise the platform workflow.`}
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#/cities" variant="outline" className="bg-white/95">
            ← All cities
          </Button>
          <Button href="#/assess" variant="primary">
            Assess your own city
          </Button>
        </div>
      </PageHero>

      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <Card className="flex flex-col items-center">
              <ScoreGauge value={city.score} band={city.band} size={200} />
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <Badge tone="brand">{city.band}</Badge>
                <Badge tone="accent">Confidence {city.confidence}</Badge>
              </div>
              <p className="mt-3 text-center text-xs text-slate-500">{DEMO_NOTE}</p>
            </Card>

            <Card>
              <h2 className="font-bold text-brand-950">Current air quality</h2>
              <div className="mt-3 flex items-center justify-between">
                <div>
                  <p className="text-3xl font-extrabold text-brand-800">
                    {reading?.europeanAqi ?? "—"}
                  </p>
                  <p className="text-xs text-slate-500">European AQI</p>
                </div>
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", band.tone)}>
                  {band.label}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">PM₂.₅</dt>
                  <dd className="font-bold text-brand-900">{reading?.pm25 ?? "—"} µg/m³</dd>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <dt className="text-xs text-slate-500">PM₁₀</dt>
                  <dd className="font-bold text-brand-900">{reading?.pm10 ?? "—"} µg/m³</dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">
                Live reading from the open Open-Meteo air-quality API at{" "}
                {reading?.time ? new Date(reading.time).toUTCString() : "—"}. Model-based, not a
                quality-assured regulatory measurement.
              </p>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <SectionTitle eyebrow="Capacity profile" title="Domain scores" />
              <div className="mt-5 grid gap-8 md:grid-cols-2">
                <CategoryBars scores={city.scores} />
                <div className="flex justify-center">
                  <Radar axes={axes} size={330} />
                </div>
              </div>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <h2 className="font-bold text-brand-950">Documented challenges</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {city.challenges.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h2 className="font-bold text-brand-950">Actions under consideration</h2>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {city.actions.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card>
              <h2 className="font-bold text-brand-950">Sources informing this profile</h2>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {city.sources.map((source) => (
                  <li key={source}>· {source}</li>
                ))}
              </ul>
              <div className="mt-5">
                <Disclaimer>
                  This profile is a demonstration artefact. It does not describe an official
                  assessment of {city.name}, and it must not be cited as one. Replace every value
                  with documented local evidence before any decision use.
                </Disclaimer>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Cities() {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState<"score" | "name" | "confidence">("score");
  const [compare, setCompare] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = cities.filter((city) => {
      const matchesQuery =
        !q ||
        [city.name, city.country, city.sector, city.climate, ...city.challenges]
          .join(" ")
          .toLowerCase()
          .includes(q);
      const matchesRegion = !region || city.region === region;
      return matchesQuery && matchesRegion;
    });
    return list.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "confidence"
          ? b.confidence - a.confidence
          : b.score - a.score,
    );
  }, [query, region, sort]);

  const compared = cities.filter((c) => compare.includes(c.id));
  const palette = ["#0e5485", "#0e9bb4", "#10b981"];

  const toggleCompare = (id: string) =>
    setCompare((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : prev.length >= 3
          ? [...prev.slice(1), id]
          : [...prev, id],
    );

  return (
    <>
      <PageHero
        eyebrow="City explorer"
        title="Compare context, capacity and evidence confidence"
        description="Twenty illustrative city profiles scored across the same twelve domains as the assessment. Use them to find peer context before you set your own priorities."
      />

      <section className="border-b border-slate-200 bg-slate-50 py-8">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow text-accent-600">Live readings</p>
              <h2 className="mt-1 text-lg font-extrabold text-brand-950">
                Current PM levels in the library
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Open-Meteo air-quality API · model data, refreshed hourly
            </p>
          </div>
          <div className="mt-4">
            <LiveAqStrip />
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[2fr_1fr_1fr]">
          <div className="relative">
            <IconSearch className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              className={`${inputCls} pl-10`}
              placeholder="Search city, country, sector or challenge…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search cities"
            />
          </div>
          <select
            className={inputCls}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            aria-label="Filter by region"
          >
            <option value="">All regions</option>
            {regionOptions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            className={inputCls}
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            aria-label="Sort order"
          >
            <option value="score">Sort by readiness</option>
            <option value="confidence">Sort by confidence</option>
            <option value="name">Sort by name</option>
          </select>
        </div>

        {compared.length > 0 && (
          <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-bold text-brand-900">
                Comparing {compared.length} of 3 · {compared.map((c) => c.name).join(" vs ")}
              </h2>
              <Button size="sm" variant="ghost" onClick={() => setCompare([])}>
                Clear comparison
              </Button>
            </div>
            <div className="mt-5 rounded-2xl bg-white p-5">
              <GroupedBars
                series={compared.map((city, i) => ({
                  name: city.name,
                  color: palette[i % palette.length],
                  scores: city.scores,
                }))}
              />
            </div>
          </div>
        )}

        <p className="mt-8 text-sm text-slate-500">
          {filtered.length} of {cities.length} profiles
        </p>

        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((city, i) => (
            <div key={city.id} data-reveal style={{ transitionDelay: `${Math.min(i, 8) * 30}ms` }}>
              <CityCard
                city={city}
                compared={compare.includes(city.id)}
                onCompare={() => toggleCompare(city.id)}
              />
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="mt-8 text-center text-sm text-slate-600">
            Nothing matches those filters. Clear the search or pick another region.
          </Card>
        )}

        <div className="mt-10">
          <Disclaimer>
            {DEMO_NOTE} Values are synthetic and used only to demonstrate the interface, scoring
            arithmetic and comparison workflow. Live readings come from a third-party open API and
            are provided for context, not compliance.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
