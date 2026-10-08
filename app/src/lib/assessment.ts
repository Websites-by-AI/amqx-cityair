import { categories, questions, confidenceItems } from "./data";
import type {
  AssessmentResult,
  AssessmentState,
  MaturityBand,
  Question,
} from "./types";

export const STORAGE_KEY = "cityair-assessment-v1";

export const emptyAssessment: AssessmentState = {
  city: {
    name: "",
    country: "",
    region: "",
    population: "",
    context: "",
    concerns: "",
    sectors: "",
    dataSources: "",
    contact: "",
  },
  answers: {},
  confidence: {},
  priorities: [],
  updatedAt: "",
};

export function maturityBand(score: number): MaturityBand {
  if (score >= 85) return "Leading";
  if (score >= 70) return "Advanced";
  if (score >= 55) return "Established";
  if (score >= 35) return "Developing";
  return "Starting";
}

export const bandTone: Record<MaturityBand, string> = {
  Starting: "bg-rose-100 text-rose-800 border-rose-200",
  Developing: "bg-sun-100 text-sun-800 border-sun-100",
  Established: "bg-brand-100 text-brand-800 border-brand-200",
  Advanced: "bg-accent-100 text-accent-800 border-accent-200",
  Leading: "bg-leaf-100 text-leaf-800 border-leaf-100",
};

export function calculateResult(state: AssessmentState): AssessmentResult {
  const categoryScores: Record<string, number> = {};
  let weightedTotal = 0;
  let totalWeight = 0;
  let completed = 0;
  let withEvidence = 0;

  for (const category of categories) {
    const qs = questions.filter((q) => q.category === category);
    let sum = 0;
    let weight = 0;
    qs.forEach((q: Question) => {
      const answer = state.answers[q.id];
      if (typeof answer?.value === "number") {
        sum += (answer.value / 4) * 100 * q.weight;
        weight += q.weight;
        completed += 1;
        if (answer.evidence || answer.link) withEvidence += 1;
      }
    });
    if (weight > 0) {
      const value = Math.round(sum / weight);
      categoryScores[category] = value;
      weightedTotal += value * weight;
      totalWeight += weight;
    }
  }

  const scored = Object.values(categoryScores);
  const score = totalWeight > 0 ? Math.round(weightedTotal / totalWeight) : 0;

  const confirmedSystems = confidenceItems.filter((i) => state.confidence[i]).length;
  const evidenceSystems = (confirmedSystems / confidenceItems.length) * 100;
  const evidenceNotes = completed > 0 ? (withEvidence / completed) * 100 : 0;
  const completeness = (scored.length / categories.length) * 100;
  const confidence = Math.round(
    evidenceSystems * 0.6 + evidenceNotes * 0.25 + completeness * 0.15,
  );

  const gaps = Object.entries(categoryScores)
    .map(([category, value]) => ({ category, score: value }))
    .sort((a, b) => a.score - b.score);

  const limitations: string[] = [];
  if (scored.length < categories.length * 0.6)
    limitations.push(
      "Fewer than 60% of domains were scored — the readiness figure is indicative only.",
    );
  if (confirmedSystems < 4)
    limitations.push(
      "Few evidence systems were confirmed, so the confidence estimate is low.",
    );
  if (withEvidence / Math.max(completed, 1) < 0.4)
    limitations.push(
      "Most answers carry no evidence note or link; reviewers cannot verify them yet.",
    );
  limitations.push(
    "Scores are planning prompts derived from self-reported answers — they are not certifications, audits or official rankings.",
  );

  return {
    score,
    band: maturityBand(score),
    categoryScores,
    confidence,
    gaps,
    limitations,
    completed,
  };
}

export function loadAssessment(): AssessmentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAssessment;
    const parsed = JSON.parse(raw) as Partial<AssessmentState>;
    return {
      ...emptyAssessment,
      ...parsed,
      city: { ...emptyAssessment.city, ...(parsed.city ?? {}) },
      answers: parsed.answers ?? {},
      confidence: parsed.confidence ?? {},
      priorities: parsed.priorities ?? [],
    };
  } catch {
    return emptyAssessment;
  }
}

export function saveAssessment(state: AssessmentState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

export function clearAssessment() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export type PlanPhase = {
  window: string;
  title: string;
  rationale: string;
  actions: string[];
};

/** Builds a phased improvement plan from the lowest-scoring domains. */
export function buildActionPlan(
  state: AssessmentState,
  result: AssessmentResult,
): PlanPhase[] {
  const weakest = result.gaps.slice(0, 4).map((g) => g.category);
  const middling = result.gaps.slice(4, 8).map((g) => g.category);
  const strong = result.gaps.slice(-3).map((g) => g.category);

  const priorityText = state.priorities.length
    ? `City priorities recorded: ${state.priorities.join(", ")}.`
    : "No explicit city priorities were recorded — confirm them with stakeholders first.";

  return [
    {
      window: "0–6 months",
      title: "Stabilise the evidence base",
      rationale: `Lowest-scoring domains: ${weakest.join(", ") || "none scored"}. ${priorityText}`,
      actions: [
        "Assign a named owner and a written scope for each weak domain.",
        "Inventory existing measurements, inventories, permits and satellite products before buying anything new.",
        "Publish a QA/QC and data-completeness note for every source you intend to rely on.",
        "Run a stakeholder workshop to confirm priorities against the recorded list.",
      ],
    },
    {
      window: "6–18 months",
      title: "Close the analytical gaps",
      rationale: `Domains to strengthen next: ${middling.join(", ") || "continue the weak set"}.`,
      actions: [
        "Connect measurements to source attribution (inventories, dispersion, receptor work).",
        "Set measurable indicators per priority sector and baseline them.",
        "Prepare a funding case with costed options and expected exposure reduction.",
        "Establish a monthly review where evidence and decisions meet.",
      ],
    },
    {
      window: "18–36 months",
      title: "Scale, communicate and institutionalise",
      rationale: `Current strengths to build on: ${strong.join(", ") || "—"}.`,
      actions: [
        "Publish an accessible annual air-quality and health progress report.",
        "Evaluate the measures delivered and adjust the portfolio using the indicators.",
        "Institutionalise the assessment cycle (re-run every 12–24 months).",
        "Exchange results with peer cities and reuse validated implementation briefs.",
      ],
    },
  ];
}

export function exportAssessment(state: AssessmentState): string {
  const result = calculateResult(state);
  return JSON.stringify(
    { schema: "cityair-assessment/1", exportedAt: new Date().toISOString(), state, result },
    null,
    2,
  );
}

export function download(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
