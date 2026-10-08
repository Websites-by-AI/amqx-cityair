import type { KbChunk, Scored } from "./types";

const STOP = new Set(
  ("a an the and or of in on for to from with without into over under is are was were be been being " +
    "do does did doing have has had having how what when where which who whom why can could should " +
    "would may might will shall i you he she it we they them their our your my me this that these " +
    "those there here about as at by if then than so not no yes its also more most less least very " +
    "much many any some all each other such only own same too please tell give show explain want " +
    "need help")
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

export type Index = {
  chunks: KbChunk[];
  df: Map<string, number>;
  tf: Map<string, number>[];
  lens: number[];
  avgLen: number;
};

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

export function search(index: Index, query: string, k = 6): Scored[] {
  const q = tokenize(query);
  const N = index.chunks.length;
  const k1 = 1.5;
  const b = 0.75;

  return index.chunks
    .map((chunk, i) => {
      const counts = index.tf[i];
      let score = 0;
      for (const term of q) {
        const f = counts.get(term);
        if (!f) continue;
        const df = index.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * index.lens[i]) / index.avgLen)));
      }
      // small boost for tag/city-name matches, which are strong signals here
      for (const tag of chunk.tags) if (q.includes(tag)) score += 1.2;
      return { chunk, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
