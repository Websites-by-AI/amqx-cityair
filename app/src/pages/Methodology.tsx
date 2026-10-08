import { calculateResult, loadAssessment } from "@/lib/assessment";
import { categories, questions } from "@/lib/data";
import {
  Bullets,
  Button,
  Card,
  Disclaimer,
  PageHero,
  SectionTitle,
} from "@/components/ui";

const WHO_ROWS = [
  { pollutant: "PM₂.₅", averaging: "Annual", it: "35 · 25 · 15 · 10", aqg: "5" },
  { pollutant: "PM₂.₅", averaging: "24-hour", it: "75 · 50 · 37.5 · 25", aqg: "15" },
  { pollutant: "PM₁₀", averaging: "Annual", it: "70 · 50 · 30 · 20", aqg: "15" },
  { pollutant: "PM₁₀", averaging: "24-hour", it: "150 · 100 · 75 · 50", aqg: "45" },
  { pollutant: "O₃", averaging: "Peak season", it: "100 · 70", aqg: "60" },
  { pollutant: "NO₂", averaging: "Annual", it: "40 · 30 · 20", aqg: "10" },
  { pollutant: "SO₂", averaging: "24-hour", it: "125 · 50", aqg: "40" },
  { pollutant: "CO", averaging: "24-hour", it: "7", aqg: "4" },
];

export default function Methodology() {
  const result = calculateResult(loadAssessment());

  return (
    <>
      <PageHero
        eyebrow="Method, limits and governance"
        title="How CityAir computes a readiness score — and where it must not be trusted"
        description="Transparency is the only defence a planning instrument has. This page documents the formula, the weights, the confidence model, the known limits and the correction process."
      />

      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Card>
            <SectionTitle eyebrow="Scoring" title="From answers to a 0–100 readiness score" />
            <div className="prose-site mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Each of the {questions.length} questions has one domain ({categories.length}{" "}
                domains in total) and a weight between 0.8 and 1.2. A scored answer from 0–4 is
                normalised to 0–100, then weighted inside its domain:
              </p>
              <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-100">
{`domainScore = Σ( (answer / 4) × 100 × weight ) / Σ(weight)

readiness = Σ( domainScore × domainWeight ) / Σ( domainWeight )`}
              </pre>
              <p>
                “Unknown” and “Not applicable” answers are excluded from both numerator and
                denominator, so honest gaps reduce completeness rather than silently lowering the
                score. The overall score is the weighted mean of the domains that were actually
                scored.
              </p>
              <p>
                Maturity bands: Starting 0–34 · Developing 35–54 · Established 55–69 · Advanced
                70–84 · Leading 85–100.
              </p>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <SectionTitle eyebrow="Confidence" title="Evidence confidence model" />
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <strong className="text-brand-900">60%</strong> confirmed evidence systems (nine
                  recognised source types, ticked only when availability is known)
                </p>
                <p>
                  <strong className="text-brand-900">25%</strong> scored answers carrying an
                  evidence note or link
                </p>
                <p>
                  <strong className="text-brand-900">15%</strong> questionnaire completeness across
                  the twelve domains
                </p>
              </div>
              <p className="mt-4 text-xs leading-6 text-slate-500">
                A high score with low confidence is the most common failure mode in self-assessment
                — it usually means the practice exists informally and would not survive staff
                turnover.
              </p>
            </Card>

            <Card>
              <SectionTitle eyebrow="Your current numbers" title="Nothing leaves your browser" />
              <div className="mt-4 text-sm text-slate-600">
                <p>
                  Domains scored: <strong>{Object.keys(result.categoryScores).length}</strong>
                </p>
                <p>
                  Readiness: <strong>{result.score}</strong> ({result.band})
                </p>
                <p>
                  Confidence: <strong>{result.confidence}</strong>
                </p>
              </div>
              <div className="mt-4">
                <Button href="#/results" variant="outline" size="sm">
                  Open the dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle eyebrow="Benchmarks" title="WHO guideline levels used as reference" />
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="pb-2">Pollutant</th>
                    <th className="pb-2">Averaging</th>
                    <th className="pb-2 text-right">Interim targets 1–4</th>
                    <th className="pb-2 text-right">AQG level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {WHO_ROWS.map((row, i) => (
                    <tr key={`${row.pollutant}-${row.averaging}-${i}`}>
                      <td className="py-2 font-semibold text-brand-900">{row.pollutant}</td>
                      <td className="py-2">{row.averaging}</td>
                      <td className="py-2 text-right font-mono text-xs">{row.it}</td>
                      <td className="py-2 text-right font-bold text-brand-800">{row.aqg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Values in µg/m³ except CO (mg/m³). Reproduced for reference from the WHO global
              air-quality guidelines; confirm current values with the source before any regulatory
              use.
            </p>
          </Card>

          <Card>
            <SectionTitle eyebrow="Limits" title="What this instrument cannot do" />
            <div className="mt-5">
              <Bullets
                items={[
                  "It is not a certification, audit, compliance check or official ranking.",
                  "Self-reported answers can be optimistic; confidence is a guard rail, not proof.",
                  "Domain weights are generic and do not reflect national legal requirements.",
                  "Demonstration city values are synthetic and must never be quoted as facts about those cities.",
                  "Live readings come from a third-party model API and are not quality-assured measurements.",
                  "Satellite and remote-sensing products must not be presented as direct quantification or verified reduction.",
                ]}
              />
            </div>
          </Card>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          <Card>
            <h3 className="font-bold text-brand-950">Data handling</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Assessment answers are stored only in your browser's localStorage. The assistant
              receives your question text, the recent conversation and — only if you press the
              button — a summary of your scores so it can explain them. No accounts, no tracking
              pixels, no third-party analytics.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-950">Corrections & governance</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Errors in guidance text, scoring or resource links can be raised as issues on the
              public repository. Substantive changes to the scoring formula or weights would be
              versioned, documented here and announced in the changelog so that past assessments
              stay interpretable.
            </p>
          </Card>
          <Card>
            <h3 className="font-bold text-brand-950">Reproducibility</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              The knowledge base, question set, weights and site code are published openly. Anyone
              can recompute a score from an exported assessment JSON file and verify the assistant's
              retrieval corpus.
            </p>
          </Card>
        </div>

        <div className="mt-10">
          <Disclaimer>
            CityAir is an independent prototype inspired by publicly documented air-quality
            management frameworks. It is not an official product of AQMx, CCAC, WRI, NASA, XPRIZE or
            the World Health Organization, and no organisation named on this site is a confirmed
            partner, funder, endorser or selector.
          </Disclaimer>
        </div>
      </section>
    </>
  );
}
