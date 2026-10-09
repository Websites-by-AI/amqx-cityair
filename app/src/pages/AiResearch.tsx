import data from "@/data/ai-research.json";
import { Badge, Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";
import { IconExternal } from "@/components/icons";

type Hub = { id: string; url: string; downloads: number | null; likes: number | null; task: string | null };
type Paper = {
  title: string;
  arxivId: string;
  url: string;
  arxiv: string;
  published: string;
  upvotes: number;
  code: string | null;
  stars: number | null;
  match: "exact" | "broader";
};
type Claim = {
  id: string;
  claim: string;
  origin: string;
  hf: { models: Hub[]; spaces: Hub[]; datasets: Hub[] };
  papers: Paper[];
};

const research = data as unknown as { generatedAt: string; source: string; note: string; claims: Claim[] };

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 underline underline-offset-2 hover:text-brand-900">
      {children}
      <IconExternal className="h-3.5 w-3.5" />
    </a>
  );
}

function HubList({ label, items, kind }: { label: string; items: Hub[]; kind: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">No matching {kind} found on the Hub.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {items.map((h) => (
            <li key={h.id}>
              <Ext href={h.url}>{h.id}</Ext>
              <span className="ml-2 text-xs text-slate-500">
                {h.downloads != null ? `${h.downloads.toLocaleString("en")} downloads` : ""}
                {h.likes != null ? ` · ${h.likes} likes` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AiResearch() {
  return (
    <>
      <PageHero
        eyebrow="AI research"
        title="AI projects and papers behind CityAir's claims"
        description="For each AI claim we searched Hugging Face for related models, Spaces and datasets, and Hugging Face Papers (the successor of Papers with Code) for about ten papers each, with their code repositories."
      />
      <div className="container-page space-y-8 py-10">
        <Disclaimer>
          Automatic search results, last updated {new Date(research.generatedAt).toISOString().slice(0, 10)}. Each item is matched by
          keyword and must be reviewed before it is cited as evidence. Papers marked <em>no code linked</em> have no repository on
          Hugging Face Papers. Source: {research.source}.
        </Disclaimer>

        {research.claims.map((c) => (
          <Card key={c.id} className="space-y-5">
            <div>
              <Badge>{c.id}</Badge>
              <h2 className="mt-2 text-lg font-bold text-brand-950">{c.claim}</h2>
              <p className="mt-1 text-sm text-slate-500">Source of the claim: {c.origin}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <HubList label="Models" items={c.hf.models} kind="models" />
              <HubList label="Spaces" items={c.hf.spaces} kind="Spaces" />
              <HubList label="Datasets" items={c.hf.datasets} kind="datasets" />
            </div>

            <div className="overflow-x-auto">
              <SectionTitle title="Related papers" />
              <table className="mt-3 w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Paper</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Match</th>
                    <th className="py-2 pr-3">Code</th>
                  </tr>
                </thead>
                <tbody>
                  {c.papers.map((p, i) => (
                    <tr key={p.arxivId} className="border-b border-slate-100 align-top">
                      <td className="py-2 pr-3 text-slate-500">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <Ext href={p.url}>{p.title}</Ext>
                        <div className="text-xs text-slate-500">
                          arXiv <Ext href={p.arxiv}>{p.arxivId}</Ext>
                        </div>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">{p.published}</td>
                      <td className="py-2 pr-3">{p.match === "exact" ? "Exact" : "Broader"}</td>
                      <td className="py-2 pr-3">
                        {p.code ? (
                          <Ext href={p.code}>
                            Repo{p.stars != null ? ` (${p.stars}★)` : ""}
                          </Ext>
                        ) : (
                          <span className="text-slate-500">no code linked</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
