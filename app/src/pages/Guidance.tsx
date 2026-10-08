import { useMemo, useState } from "react";
import { guidance } from "@/lib/data";
import {
  Bullets,
  Button,
  Card,
  Disclaimer,
  PageHero,
  SectionTitle,
  inputCls,
} from "@/components/ui";
import { IconSearch } from "@/components/icons";

function hashQuery() {
  const hash = window.location.hash;
  const q = hash.split("?")[1] ?? "";
  return new URLSearchParams(q).get("d");
}

export default function Guidance() {
  const [query, setQuery] = useState("");
  const [openSlug, setOpenSlug] = useState<string | null>(() => hashQuery());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guidance;
    return guidance.filter((domain) =>
      [domain.category, domain.summary, ...domain.actions, ...domain.data]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query]);

  return (
    <>
      <PageHero
        eyebrow="Sectoral guidance"
        title="Twelve domains of air-quality management capacity"
        description="Each domain describes what good practice looks like, the questions a city team should be able to answer, the data the domain depends on, the maturity sequence and public references to consult."
      />

      <section className="container-page py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <IconSearch className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              className={`${inputCls} pl-10`}
              placeholder="Search domains, actions or data needs…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search guidance domains"
            />
          </div>
          <p className="text-sm text-slate-500">
            {filtered.length} of {guidance.length} domains
          </p>
        </div>

        <div className="mt-8 space-y-4">
          {filtered.map((domain, index) => {
            const open = openSlug === domain.slug;
            return (
              <article
                key={domain.slug}
                id={domain.slug}
                data-reveal
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                style={{ transitionDelay: `${Math.min(index, 6) * 40}ms` }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                  <div className="max-w-3xl">
                    <p className="eyebrow text-accent-600">Domain {index + 1}</p>
                    <h2 className="mt-1.5 text-xl font-extrabold text-brand-950">
                      {domain.category}
                    </h2>
                    <p className="mt-2 leading-7 text-slate-600">{domain.summary}</p>
                  </div>
                  <Button
                    variant={open ? "dark" : "outline"}
                    size="sm"
                    onClick={() => setOpenSlug(open ? null : domain.slug)}
                    aria-expanded={open}
                  >
                    {open ? "Hide brief" : "Open brief"}
                  </Button>
                </div>

                {open && (
                  <div className="border-t border-slate-200 bg-slate-50 p-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Guiding questions
                        </h3>
                        <div className="mt-3">
                          <Bullets items={domain.questions} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Recommended actions
                        </h3>
                        <div className="mt-3">
                          <Bullets items={domain.actions} tone="leaf" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Data the domain needs
                        </h3>
                        <div className="mt-3">
                          <Bullets items={domain.data} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                          Public references
                        </h3>
                        <div className="mt-3">
                          <Bullets items={domain.resources} />
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-sm font-bold uppercase tracking-wide text-brand-700">
                        Maturity sequence
                      </h3>
                      <ol className="mt-3 flex flex-wrap gap-2">
                        {domain.stages.map((stage, i) => (
                          <li
                            key={stage}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800"
                          >
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-brand-700 text-[10px] font-bold text-white">
                              {i + 1}
                            </span>
                            {stage}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button href="#/assess" size="sm">
                        Score this domain
                      </Button>
                      <Button
                        href={`#/assistant`}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          sessionStorage.setItem("cityair-assistant-seed", `Explain the guidance domain “${domain.category}”.`);
                        }}
                      >
                        Ask the assistant
                      </Button>
                      <Button href="#/innovations" variant="ghost" size="sm">
                        Related innovations →
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <Card className="mt-8 text-center">
            <p className="text-sm text-slate-600">
              No domain matches “{query}”. Try “methane”, “waste”, “health” or “legal”.
            </p>
          </Card>
        )}

        <div className="mt-12">
          <SectionTitle
            eyebrow="How to use the domains"
            title="Domain guidance is a checklist for evidence, not a shopping list for equipment"
            description="Start from the decision the city needs to make, then work backwards to the evidence required. Most cities improve faster by documenting and connecting existing data than by adding new instruments."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Diagnose before you invest",
                text: "Confirm what already exists across agencies, universities and operators. Duplication is the most common source of wasted budget.",
              },
              {
                title: "Document uncertainty",
                text: "Every evidence source has limits. Stating them protects the credibility of the decisions that follow.",
              },
              {
                title: "Design for the decision cycle",
                text: "Evidence must arrive before the budget, permit or procurement decision it is meant to inform.",
              },
            ].map((item) => (
              <Card key={item.title} as="article">
                <h3 className="font-bold text-brand-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6">
            <Disclaimer>
              Domain summaries are CityAir's own synthesis of publicly documented practice. They
              are not official guidance of any organisation and should be validated against
              current national regulation and the cited public sources.
            </Disclaimer>
          </div>
        </div>
      </section>
    </>
  );
}
