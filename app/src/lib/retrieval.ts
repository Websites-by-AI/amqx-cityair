import type { KbChunk } from "./types";

const STOP = new Set(
  ("a an the and or of in on for to from with without into over under is are was were be been " +
    "being do does did doing have has had having how what when where which who whom why can " +
    "could should would may might will shall i you he she it we they them their our your my me " +
    "this that these those there here about as at by if then than so not no yes its it's s t " +
    "also more most less least very much many any some all each other such only own same too " +
    "please tell give show explain want need help")
    .split(/\s+/)
    .filter(Boolean),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOP.has(t));
}

type Index = {
  chunks: KbChunk[];
  df: Map<string, number>;
  lens: number[];
  avgLen: number;
  tf: Map<string, number>[];
};

/** Tiny BM25 index — used client-side as an offline fallback when /api is unreachable. */
export function buildIndex(chunks: KbChunk[]): Index {
  const df = new Map<string, number>();
  const tf: Map<string, number>[] = [];
  const lens: number[] = [];

  for (const chunk of chunks) {
    const tokens = tokenize(`${chunk.title} ${chunk.title} ${chunk.text} ${chunk.tags.join(" ")}`);
    const counts = new Map<string, number>();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    tf.push(counts);
    lens.push(tokens.length);
    for (const token of counts.keys()) df.set(token, (df.get(token) ?? 0) + 1);
  }

  return {
    chunks,
    df,
    tf,
    lens,
    avgLen: lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length),
  };
}

export function search(
  index: Index,
  query: string,
  k = 5,
): { chunk: KbChunk; score: number }[] {
  const q = tokenize(query);
  const N = index.chunks.length;
  const k1 = 1.5;
  const b = 0.75;

  const scored = index.chunks.map((chunk, i) => {
    const counts = index.tf[i];
    let score = 0;
    for (const term of q) {
      const f = counts.get(term);
      if (!f) continue;
      const df = index.df.get(term) ?? 0;
      const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
      score +=
        idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * index.lens[i]) / index.avgLen)));
    }
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

/** Extractive fallback answer: the best chunks, quoted, with a caveat. */
export function extractiveAnswer(
  index: Index,
  query: string,
  k = 3,
): { answer: string; sources: { id: string; title: string; source: string }[] } {
  const hits = search(index, query, k);
  if (!hits.length) {
    return {
      answer:
        "I could not find this in the CityAir knowledge base. The base covers guidance domains, maturity stages, the assessment method and scoring, city profiles, the innovation library and public resources. Try rephrasing, or open the Guidance and Methodology pages.",
      sources: [],
    };
  }
  const body = hits
    .map((h) => `**${h.chunk.title}** — ${h.chunk.text}`)
    .join("\n\n");
  return {
    answer:
      `The assistant service is currently unreachable, so here are the closest knowledge-base extracts for “${query}”:\n\n${body}\n\n_Extracts are quoted verbatim from the CityAir knowledge base; scores and city data are illustrative._`,
    sources: hits.map((h) => ({
      id: h.chunk.id,
      title: h.chunk.title,
      source: h.chunk.source,
    })),
  };
}
