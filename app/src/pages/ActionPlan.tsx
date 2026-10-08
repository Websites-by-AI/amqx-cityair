import { useEffect, useMemo, useState } from "react";
import { calculateResult, buildActionPlan, download, loadAssessment } from "@/lib/assessment";
import type { AssessmentState } from "@/lib/types";
import { Button, Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";

export default function ActionPlan() {
  const [state, setState] = useState<AssessmentState | null>(null);

  useEffect(() => setState(loadAssessment()), []);
  const result = useMemo(() => (state ? calculateResult(state) : null), [state]);
  const plan = useMemo(
    () => (state && result ? buildActionPlan(state, result) : []),
    [state, result],
  );

  if (!state || !result) {
    return (
      <div className="container-page py-20">
        <Card className="text-center text-sm text-slate-600">Loading…</Card>
      </div>
    );
  }

  const planText = [
    `CityAir phased action plan — ${state.city.name || "city"} (${result.band}, score ${result.score}/100)`,
    `Evidence confidence: ${result.confidence}/100 · generated ${new Date().toISOString().slice(0, 10)}`,
    "",
    ...plan.flatMap((phase) => [
      `${phase.window} — ${phase.title}`,
      `Rationale: ${phase.rationale}`,
      ...phase.actions.map((a) => `  - ${a}`),
      "",
    ]),
    "Disclaimer: planning prompts derived from self-reported answers; not a certification or audit.",
  ].join("\n");

  return (
    <>
      <PageHero
        eyebrow="Action planning"
        title="A phased improvement plan generated from your gaps"
        description="The plan converts the lowest-scoring domains into three time windows with concrete actions, owners and rationale. Treat it as a drafting aid for your own budget and governance process."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#/assess" variant="outline" className="bg-white/95">
            Adjust the assessment
          </Button>
          <Button onClick={() => window.print()} variant="primary">
            Print / PDF
          </Button>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10"
            onClick={() => download("cityair-action-plan.txt", planText, "text/plain")}
          >
            Download as text
          </Button>
        </div>
      </PageHero>

      <section className="container-page py-12">
        {result.completed === 0 ? (
          <Card className="text-center">
            <h2 className="text-xl font-bold text-brand-950">No scored answers yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
              The plan is derived from your domain scores and recorded priorities. Complete at
              least one domain to generate it.
            </p>
            <div className="mt-5 flex justify-center">
              <Button href="#/assess">Open the assessment</Button>
            </div>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">City</p>
                <p className="mt-1 text-lg font-bold text-brand-950">
                  {state.city.name || "Not named"}
                </p>
                <p className="text-sm text-slate-500">{state.city.country}</p>
              </Card>
              <Card>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Readiness
                </p>
                <p className="mt-1 text-lg font-bold text-brand-950">
                  {result.score}/100 · {result.band}
                </p>
                <p className="text-sm text-slate-500">Confidence {result.confidence}/100</p>
              </Card>
              <Card>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Stated priorities
                </p>
                <p className="mt-1 text-sm text-brand-900">
                  {state.priorities.length ? state.priorities.join(" · ") : "None recorded"}
                </p>
              </Card>
            </div>

            <div className="mt-10 space-y-6">
              {plan.map((phase, index) => (
                <Card key={phase.window} data-reveal>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <p className="eyebrow text-accent-600">{phase.window}</p>
                      <h2 className="mt-1 text-xl font-extrabold text-brand-950">
                        {index + 1}. {phase.title}
                      </h2>
                    </div>
                    <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                      Phase {index + 1} of {plan.length}
                    </span>
                  </div>
                  <p className="mt-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    <strong className="text-brand-900">Rationale: </strong>
                    {phase.rationale}
                  </p>
                  <ol className="mt-5 grid gap-3 md:grid-cols-2">
                    {phase.actions.map((action, i) => (
                      <li
                        key={action}
                        className="flex gap-3 rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-700"
                      >
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-100 text-[11px] font-bold text-accent-800">
                          {i + 1}
                        </span>
                        {action}
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <Card>
                <SectionTitle
                  eyebrow="Governance"
                  title="Make the plan survive the budget cycle"
                  description="A plan without owners, costs and a review date is a wish list. Attach these before the plan leaves the technical team."
                />
                <ul className="mt-5 space-y-2 text-sm text-slate-600">
                  {[
                    "Named owner per action, with a deputy",
                    "Costed options (low / medium / high ambition)",
                    "Legal or procurement route identified",
                    "Indicator + baseline per action",
                    "Review date in the annual cycle",
                  ].map((item) => (
                    <li key={item} className="rounded-lg border border-slate-200 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="font-bold text-brand-950">Next steps</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Share the plan with the domains' owners, then re-run the assessment after the
                  first implementation round to measure movement. The assessment is designed to be
                  repeated — a rising score with rising confidence is the signal that capacity is
                  genuinely improving.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button href="#/innovation-match" variant="outline">
                    Match innovations to these gaps
                  </Button>
                  <Button href="#/results" variant="ghost">
                    Back to results
                  </Button>
                </div>
                <div className="mt-5">
                  <Disclaimer>
                    This plan is generated automatically from your answers and CityAir's generic
                    guidance. It does not replace legal, financial or engineering advice, and every
                    action must be checked against local law and competence.
                  </Disclaimer>
                </div>
              </Card>
            </div>
          </>
        )}
      </section>
    </>
  );
}
