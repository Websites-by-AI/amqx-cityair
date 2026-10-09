import marketJson from "@/data/market.json";
import { Badge, Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";
import { IconExternal } from "@/components/icons";

type Scores = { problem: number; mandate: number; relation: number; fit: number; timing: number; signal: number };
type Source = { label: string; url: string };
type Entry = {
  id: string;
  name: string;
  country: string;
  group?: string;
  what?: string;
  scores: Scores;
  why: string;
  offer: string;
  sources: Source[];
};
type Market = {
  updated: string;
  status: string;
  weights: Record<keyof Scores, number>;
  criteria: Record<keyof Scores, string>;
  companies: Entry[];
  municipalities: Entry[];
  countries: Entry[];
  unscored: string;
};

const data = marketJson as unknown as Market;
const KEYS = Object.keys(data.weights) as (keyof Scores)[];

/** Weighted score out of 100, from the weights in market.json. */
function total(e: Entry): number {
  const raw = KEYS.reduce((sum, k) => sum + data.weights[k] * e.scores[k], 0);
  return Math.round((raw / 5) * 100);
}

function Ranked({ title, intro, items }: { title: string; intro: string; items: Entry[] }) {
  const sorted = [...items].sort((a, b) => total(b) - total(a));
  return (
    <section className="space-y-4">
      <SectionTitle title={title} description={intro} />
      {sorted.map((e, i) => (
        <Card key={e.id} className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">
                #{i + 1} · {e.country}
                {e.group ? ` · ${e.group}` : ""}
              </p>
              <h3 className="text-lg font-bold text-brand-950">{e.name}</h3>
            </div>
            <Badge tone={total(e) >= 75 ? "brand" : "sun"}>Score {total(e)} / 100</Badge>
          </div>
          {e.what && <p className="text-sm text-slate-600">{e.what}</p>}
          <p className="text-sm text-slate-700">
            <strong>Why:</strong> {e.why}
          </p>
          <p className="text-sm text-slate-700">
            <strong>What we would offer:</strong> {e.offer}
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 sm:grid-cols-6">
            {KEYS.map((k) => (
              <div key={k} className="rounded-lg bg-slate-50 p-2">
                <div className="font-semibold capitalize">{k}</div>
                <div className="text-base font-bold text-brand-900">{e.scores[k]}/5</div>
              </div>
            ))}
          </div>
          <ul className="flex flex-wrap gap-3 text-xs">
            {e.sources.map((s) => {
              const internal = s.url.startsWith("#");
              return (
                <li key={s.url + s.label}>
                  <a
                    href={s.url}
                    {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                    className="inline-flex items-center gap-1 text-brand-700 underline underline-offset-2"
                  >
                    {s.label}
                    {!internal && <IconExternal className="h-3 w-3" />}
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      ))}
    </section>
  );
}

export default function Market() {
  return (
    <>
      <PageHero
        eyebrow="Market & partners"
        title="Who would work with CityAir, and who would act on it"
        description="Two sides of the market: partners who supply models, data and waste sources, and decision-makers who would buy or adopt the platform. Ranked by a transparent score."
      />
      <div className="container-page space-y-12 py-10">
        <Disclaimer>
          {data.status} Last updated {data.updated}. Weights:{" "}
          {KEYS.map((k) => `${k} ${Math.round(data.weights[k] * 100)}%`).join(", ")}.
        </Disclaimer>

        <Card>
          <h2 className="text-base font-bold text-brand-950">How the score works</h2>
          <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
            {KEYS.map((k) => (
              <div key={k}>
                <dt className="font-semibold capitalize">{k}</dt>
                <dd className="text-slate-600">{data.criteria[k]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="grid gap-10 lg:grid-cols-2">
          <Ranked
            title="Side A: partners and suppliers"
            intro="Companies and organisations that would supply models, data, sensors or the waste sources themselves."
            items={data.companies}
          />
          <Ranked
            title="Side B: municipalities and governments"
            intro="Cities, ministries and countries that would commission, adopt or fund the platform."
            items={[...data.municipalities, ...data.countries]}
          />
        </div>

        <Disclaimer tone="sky">{data.unscored}</Disclaimer>
      </div>
    </>
  );
}
