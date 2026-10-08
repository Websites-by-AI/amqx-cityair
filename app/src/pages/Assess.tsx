import { useEffect, useMemo, useState } from "react";
import {
  categories,
  cities,
  confidenceItems,
  populationOptions,
  priorityOptions,
  questions,
  regionOptions,
} from "@/lib/data";
import {
  calculateResult,
  clearAssessment,
  download,
  emptyAssessment,
  exportAssessment,
  loadAssessment,
  saveAssessment,
} from "@/lib/assessment";
import type { AssessmentState } from "@/lib/types";
import {
  Bullets,
  Button,
  Card,
  Disclaimer,
  Field,
  Progress,
  SectionTitle,
  cn,
  inputCls,
} from "@/components/ui";
const STEPS = [
  "City context",
  "Domain scoring",
  "Evidence systems",
  "Evidence notes",
  "Priorities",
] as const;

const SCALE: { value: number; label: string; hint: string }[] = [
  { value: 0, label: "0 · Absent", hint: "No system, no practice, nothing documented" },
  { value: 1, label: "1 · Initial", hint: "Ad-hoc, informal, undocumented" },
  { value: 2, label: "2 · Developing", hint: "Partly in place, incomplete coverage" },
  { value: 3, label: "3 · Established", hint: "Systematic, documented, mostly complete" },
  { value: 4, label: "4 · Leading", hint: "Systematic, evaluated, published, improving" },
];

export default function Assess() {
  const [state, setState] = useState<AssessmentState>(emptyAssessment);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [savedToast, setSavedToast] = useState("");

  useEffect(() => {
    setState(loadAssessment());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) saveAssessment(state);
  }, [state, ready]);

  const result = useMemo(() => calculateResult(state), [state]);

  const answeredCount = questions.filter(
    (q) => typeof state.answers[q.id]?.value !== "undefined",
  ).length;

  const setAnswer = (id: string, value: number | "unknown" | "na") =>
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [id]: { ...prev.answers[id], value } },
    }));

  const setEvidence = (id: string, key: "evidence" | "link", value: string) =>
    setState((prev) => ({
      ...prev,
      answers: {
        ...prev.answers,
        [id]: { ...(prev.answers[id] ?? { value: "unknown" }), [key]: value },
      },
    }));

  const reset = () => {
    if (!confirm("Restart and remove saved assessment progress from this browser?")) return;
    clearAssessment();
    setState(emptyAssessment);
    setStep(0);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const candidate = parsed?.state ?? parsed;
        if (!candidate?.answers) throw new Error("bad file");
        setState({ ...emptyAssessment, ...candidate });
        setSavedToast("Assessment imported.");
        setTimeout(() => setSavedToast(""), 2500);
      } catch {
        setSavedToast("That file could not be read as a CityAir assessment.");
        setTimeout(() => setSavedToast(""), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="container-page py-10">
          <p className="eyebrow text-accent-600">Readiness assessment</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-brand-950 md:text-4xl">
            Score your city across twelve domains
          </h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-600">
            Twelve weighted questions, one per domain, from 0 (absent) to 4 (leading), plus
            “unknown” and “not applicable”. Progress is saved in this browser only.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <Progress
                value={((step + 1) / STEPS.length) * 100}
                label={`Step ${step + 1} of ${STEPS.length} · ${STEPS[step]}`}
              />
              <ol className="mt-4 flex flex-wrap gap-2">
                {STEPS.map((label, i) => (
                  <li key={label}>
                    <button
                      onClick={() => setStep(i)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                        i === step
                          ? "bg-brand-700 text-white"
                          : i < step
                            ? "bg-leaf-100 text-leaf-800"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {i + 1}. {label}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Live progress
              </p>
              <p className="mt-1 text-3xl font-extrabold text-brand-800">
                {answeredCount}
                <span className="text-lg text-slate-400">/{questions.length}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Current score <strong className="text-brand-900">{result.score}</strong> ·{" "}
                {result.band}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => download("cityair-assessment.json", exportAssessment(state))}>
                  Export JSON
                </Button>
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:border-brand-400">
                  Import
                  <input
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
                  />
                </label>
                <Button size="sm" variant="ghost" onClick={reset}>
                  Reset
                </Button>
              </div>
            </div>
          </div>
          {savedToast && (
            <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              {savedToast}
            </p>
          )}
        </div>
      </section>

      <section className="container-page py-10">
        {step === 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionTitle eyebrow="Step 1" title="City context" />
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <Field label="City name">
                  <input
                    className={inputCls}
                    value={state.city.name}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, name: e.target.value } }))}
                    placeholder="e.g. Bishkek"
                  />
                </Field>
                <Field label="Country">
                  <input
                    className={inputCls}
                    value={state.city.country}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, country: e.target.value } }))}
                  />
                </Field>
                <Field label="Region">
                  <select
                    className={inputCls}
                    value={state.city.region}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, region: e.target.value } }))}
                  >
                    <option value="">Select a region</option>
                    {regionOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Population">
                  <select
                    className={inputCls}
                    value={state.city.population}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, population: e.target.value } }))}
                  >
                    <option value="">Select a range</option>
                    {populationOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Agglomeration / climate context">
                  <input
                    className={inputCls}
                    value={state.city.context}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, context: e.target.value } }))}
                    placeholder="e.g. Valley, winter inversions, coal heating"
                  />
                </Field>
                <Field label="Main sectors of concern">
                  <input
                    className={inputCls}
                    value={state.city.sectors}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, sectors: e.target.value } }))}
                    placeholder="e.g. Transport, household energy, waste"
                  />
                </Field>
              </div>
              <div className="mt-5 grid gap-5">
                <Field label="Known concerns" hint="What do you already suspect drives exposure?">
                  <textarea
                    className={`${inputCls} min-h-[88px]`}
                    value={state.city.concerns}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, concerns: e.target.value } }))}
                  />
                </Field>
                <Field label="Data sources already available">
                  <textarea
                    className={`${inputCls} min-h-[88px]`}
                    value={state.city.dataSources}
                    onChange={(e) => setState((s) => ({ ...s, city: { ...s.city, dataSources: e.target.value } }))}
                  />
                </Field>
              </div>
            </Card>
            <div className="space-y-4">
              <Card>
                <h3 className="font-bold text-brand-950">Load a demonstration city</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Prefill the context fields from the illustrative city library to explore the
                  workflow quickly. Scores still come from your own answers.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {cities.slice(0, 6).map((city) => (
                    <Button
                      key={city.id}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          city: {
                            ...s.city,
                            name: city.name,
                            country: city.country,
                            region: city.region,
                            population: city.population,
                            context: city.climate,
                            concerns: city.challenges.join("; "),
                            sectors: city.sector,
                          },
                        }))
                      }
                    >
                      {city.name}
                    </Button>
                  ))}
                </div>
              </Card>
              <Disclaimer>
                Do not enter confidential or personal data. This prototype stores answers in your
                own browser (localStorage) and only sends them to the assistant if you explicitly
                click “Ask the assistant about these results”.
              </Disclaimer>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <SectionTitle
              eyebrow="Step 2"
              title="Score each domain from 0 to 4"
              description="Answer for the whole urban area, not a single site. Where evidence is missing, choose “unknown” rather than guessing — unknown answers are excluded from the denominator."
            />
            {questions.map((q) => {
              const current = state.answers[q.id]?.value;
              return (
                <Card key={q.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                      <p className="eyebrow text-accent-600">{q.category}</p>
                      <p className="mt-1.5 font-semibold leading-7 text-brand-950">{q.question}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                      weight {q.weight}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    {SCALE.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setAnswer(q.id, option.value)}
                        title={option.hint}
                        aria-pressed={current === option.value}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                          current === option.value
                            ? "border-brand-700 bg-brand-700 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:border-brand-300",
                        )}
                      >
                        {option.label}
                        <span
                          className={cn(
                            "mt-0.5 block text-[10px] font-normal",
                            current === option.value ? "text-brand-100" : "text-slate-500",
                          )}
                        >
                          {option.hint}
                        </span>
                      </button>
                    ))}
                    <button
                      onClick={() => setAnswer(q.id, "unknown")}
                      aria-pressed={current === "unknown"}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                        current === "unknown"
                          ? "border-sun-600 bg-sun-100 text-sun-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-sun-400",
                      )}
                    >
                      Unknown
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                        Excluded from scoring
                      </span>
                    </button>
                    <button
                      onClick={() => setAnswer(q.id, "na")}
                      aria-pressed={current === "na"}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition",
                        current === "na"
                          ? "border-slate-500 bg-slate-100 text-slate-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400",
                      )}
                    >
                      Not applicable
                      <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                        Excluded from scoring
                      </span>
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <SectionTitle
                eyebrow="Step 3"
                title="Confirm the evidence systems you can actually rely on"
                description="Tick only sources whose availability and quality you know. This drives 60% of the evidence-confidence figure."
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {confidenceItems.map((item) => (
                  <label
                    key={item}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm",
                      state.confidence[item]
                        ? "border-accent-400 bg-accent-50 text-brand-900"
                        : "border-slate-200",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4"
                      checked={!!state.confidence[item]}
                      onChange={(e) =>
                        setState((s) => ({
                          ...s,
                          confidence: { ...s.confidence, [item]: e.target.checked },
                        }))
                      }
                    />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </Card>
            <div className="space-y-4">
              <Card>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Confidence now
                </p>
                <p className="mt-1 text-4xl font-extrabold text-brand-800">{result.confidence}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Weighted combination of confirmed evidence systems (60%), answers carrying
                  evidence notes (25%) and domain completeness (15%).
                </p>
              </Card>
              <Card>
                <h3 className="font-bold text-brand-950">What counts as evidence?</h3>
                <div className="mt-3">
                  <Bullets
                    items={[
                      "A named dataset with a documented owner and update cycle",
                      "QA/QC records, calibration logs or completeness statistics",
                      "A published report, permit register or inventory with a base year",
                      "A satellite product whose limitations you can state",
                    ]}
                  />
                </div>
              </Card>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <SectionTitle
              eyebrow="Step 4"
              title="Attach evidence notes and links (optional but valuable)"
              description="For each answer you scored, note what supports it. This raises confidence and makes the result reviewable by colleagues."
            />
            {questions.map((q) => {
              const answer = state.answers[q.id];
              if (!answer || typeof answer.value !== "number") return null;
              return (
                <Card key={q.id}>
                  <p className="text-xs font-bold uppercase tracking-wide text-accent-600">
                    {q.category} · scored {answer.value}/4
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-slate-700">{q.question}</p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Evidence note">
                      <textarea
                        className={`${inputCls} min-h-[80px]`}
                        value={answer.evidence ?? ""}
                        onChange={(e) => setEvidence(q.id, "evidence", e.target.value)}
                        placeholder="What supports this score? Owner, document, dataset…"
                      />
                    </Field>
                    <Field label="Evidence link">
                      <input
                        className={inputCls}
                        value={answer.link ?? ""}
                        onChange={(e) => setEvidence(q.id, "link", e.target.value)}
                        placeholder="https://…"
                      />
                    </Field>
                  </div>
                </Card>
              );
            })}
            {questions.every((q) => typeof state.answers[q.id]?.value !== "number") && (
              <Card className="text-center text-sm text-slate-600">
                No numeric answers yet — go back to step 2 to score at least one domain.
              </Card>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Card>
              <SectionTitle
                eyebrow="Step 5"
                title="Record the city's stated priorities"
                description="Priorities shape the action plan and the innovation match. Select everything that applies."
              />
              <div className="mt-6 flex flex-wrap gap-2">
                {priorityOptions.map((priority) => {
                  const active = state.priorities.includes(priority);
                  return (
                    <button
                      key={priority}
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          priorities: active
                            ? s.priorities.filter((p) => p !== priority)
                            : [...s.priorities, priority],
                        }))
                      }
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-sm font-semibold transition",
                        active
                          ? "border-leaf-600 bg-leaf-100 text-leaf-800"
                          : "border-slate-200 bg-white text-slate-700 hover:border-leaf-400",
                      )}
                    >
                      {priority}
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="#/results" size="lg">
                  Save &amp; view results
                </Button>
                <Button href="#/action-plan" variant="outline" size="lg">
                  Generate action plan
                </Button>
              </div>
            </Card>
            <Card>
              <h3 className="font-bold text-brand-950">Ready to review</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>
                  Domains scored: <strong>{Object.keys(result.categoryScores).length}</strong> of{" "}
                  {categories.length}
                </p>
                <p>
                  Evidence confidence: <strong>{result.confidence}</strong>/100
                </p>
                <p>
                  Readiness score: <strong>{result.score}</strong> · {result.band}
                </p>
                <p>
                  Priorities selected: <strong>{state.priorities.length}</strong>
                </p>
              </div>
              <div className="mt-5">
                <Button
                  variant="outline"
                  onClick={() => download("cityair-assessment.json", exportAssessment(state))}
                >
                  Export this assessment
                </Button>
              </div>
            </Card>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            ← Previous
          </Button>
          <p className="text-xs text-slate-500">
            Saved locally · last change {state.updatedAt ? new Date(state.updatedAt).toLocaleString() : "—"}
          </p>
          <Button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}>
            Next →
          </Button>
        </div>
      </section>
    </>
  );
}
