import { useEffect, useMemo, useState } from "react";
import { calculateResult, download, exportAssessment, loadAssessment } from "@/lib/assessment";
import type { AssessmentState } from "@/lib/types";
import { CityAirChatInline } from "./Assistant";
import {
  Bullets,
  Button,
  Card,
  Disclaimer,
  PageHero,
  Progress,
  SectionTitle,
} from "@/components/ui";
import { CategoryBars, ConfidenceDial, ScoreGauge } from "@/components/charts";
import { bandTone } from "@/lib/assessment";
import { cn } from "@/components/ui";

export default function Results() {
  const [state, setState] = useState<AssessmentState | null>(null);

  useEffect(() => {
    setState(loadAssessment());
  }, []);

  const result = useMemo(() => (state ? calculateResult(state) : null), [state]);

  if (!state || !result) {
    return (
      <div className="container-page py-20">
        <Card className="text-center">
          <p className="text-sm text-slate-600">Loading your saved assessment…</p>
        </Card>
      </div>
    );
  }

  if (result.completed === 0) {
    return (
      <>
        <PageHero
          eyebrow="Results"
          title="No scored answers yet"
          description="Complete at least one domain in the assessment to generate a readiness dashboard, gap analysis and action plan."
        />
        <div className="container-page py-16">
          <Card className="text-center">
            <h2 className="text-xl font-bold text-brand-950">Start with the assessment</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              Twelve weighted questions across the domains that determine whether clean-air plans
              deliver. Your answers stay in this browser.
            </p>
            <div className="mt-5 flex justify-center gap-3">
              <Button href="#/assess">Open the assessment</Button>
              <Button href="#/guidance" variant="outline">
                Read the guidance first
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const scored = Object.keys(result.categoryScores).length;

  return (
    <>
      <PageHero
        eyebrow="Readiness dashboard"
        title={`${state.city.name || "Your city"} · ${result.band} stage`}
        description="Readiness, evidence confidence and the domain gaps that should drive the next budget conversation. Everything below is generated locally from your answers."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#/assess" variant="outline" className="bg-white/95">
            Edit answers
          </Button>
          <Button href="#/action-plan" variant="primary">
            Generate action plan
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => window.print()}
          >
            Print / PDF
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() =>
              download(
                `cityair-${(state.city.name || "city").toLowerCase().replace(/\s+/g, "-")}-results.json`,
                exportAssessment(state),
              )
            }
          >
            Export JSON
          </Button>
        </div>
      </PageHero>

      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card className="flex flex-col items-center justify-center">
            <ScoreGauge value={result.score} band={result.band} size={220} />
            <span
              className={cn(
                "mt-4 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide",
                bandTone[result.band],
              )}
            >
              {result.band} · {scored}/{Object.keys(result.categoryScores).length || 12} domains
            </span>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <ConfidenceDial value={result.confidence} />
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Confidence reflects confirmed evidence systems (60%), answers carrying evidence
                notes or links (25%) and questionnaire completeness (15%). A high score with low
                confidence means “claimed but not yet evidenced”.
              </p>
            </Card>
            <Card>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Answers scored
              </p>
              <p className="mt-1 text-3xl font-extrabold text-brand-800">{result.completed}</p>
              <div className="mt-3">
                <Progress value={(scored / 12) * 100} label="Domain completeness" />
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {state.priorities.length
                  ? `Priorities: ${state.priorities.join(", ")}.`
                  : "No priorities recorded — the action plan will flag this."}
              </p>
            </Card>

            <Card className="sm:col-span-2">
              <SectionTitle eyebrow="Domain scores" title="Where capacity is strongest and weakest" />
              <div className="mt-5">
                <CategoryBars scores={result.categoryScores} />
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle
              eyebrow="Priority gaps"
              title="Lowest-scoring domains"
              description="These drive the phased action plan. Fix evidence first: most gaps are documentation and connection problems rather than equipment problems."
            />
            <ol className="mt-5 space-y-3">
              {result.gaps.slice(0, 5).map((gap, i) => (
                <li
                  key={gap.category}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-rose-100 text-xs font-bold text-rose-700">
                      {i + 1}
                    </span>
                    <span className="text-sm font-semibold text-brand-950">{gap.category}</span>
                  </span>
                  <span className="text-sm font-bold text-rose-700">{gap.score}</span>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <SectionTitle eyebrow="Interpretation" title="How to read this responsibly" />
            <div className="mt-5">
              <Bullets items={result.limitations} />
            </div>
            <div className="mt-5">
              <Disclaimer>
                Scores are planning prompts based on self-reported answers. They are not
                certifications, audits, compliance findings or official city rankings, and must not
                be presented as verified emission reductions.
              </Disclaimer>
            </div>
          </Card>
        </div>

        <div className="mt-10">
          <CityAirChatInline
            seed="My assessment results: score {score}, band {band}, weakest domains {gaps}. What should I prioritise first and why?"
            context={{
              city: state.city,
              score: result.score,
              band: result.band,
              gaps: result.gaps.slice(0, 5),
              confidence: result.confidence,
              priorities: state.priorities,
            }}
          />
        </div>
      </section>
    </>
  );
}
