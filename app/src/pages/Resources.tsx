import { useMemo, useState } from "react";
import { resources } from "@/lib/data";
import {
  Badge,
  Button,
  Card,
  Disclaimer,
  PageHero,
  SectionTitle,
  inputCls,
} from "@/components/ui";
import { IconExternal, IconSearch } from "@/components/icons";
import { SITE } from "@/components/layout";

export default function Resources() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [topic, setTopic] = useState("");

  const types = useMemo(() => Array.from(new Set(resources.map((r) => r.type))).sort(), []);
  const topics = useMemo(() => Array.from(new Set(resources.map((r) => r.topic))).sort(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      const matchesQuery =
        !q ||
        [r.title, r.organization, r.summary, r.topic].join(" ").toLowerCase().includes(q);
      return matchesQuery && (!type || r.type === type) && (!topic || r.topic === topic);
    });
  }, [query, type, topic]);

  return (
    <>
      <PageHero
        eyebrow="Public resources"
        title="References you can check yourself"
        description="CityAir intentionally links to primary public sources instead of restating them. Each entry names the publishing organisation, the type of material and what it is useful for."
      />

      <section className="container-page py-10">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[2fr_1fr_1fr]">
          <div className="relative">
            <IconSearch className="absolute left-3 top-3.5 text-slate-400" size={18} />
            <input
              className={`${inputCls} pl-10`}
              placeholder="Search title, organisation or topic…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search resources"
            />
          </div>
          <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)} aria-label="Filter by topic">
            <option value="">All topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          {filtered.length} of {resources.length} references
        </p>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {filtered.map((resource) => (
            <Card key={resource.title} as="article" className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{resource.type}</Badge>
                <Badge tone="slate">{resource.region}</Badge>
                <span className="text-xs text-slate-500">{resource.year}</span>
              </div>
              <h2 className="mt-3 font-bold text-brand-950">{resource.title}</h2>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-accent-600">
                {resource.organization}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{resource.summary}</p>
              <div className="mt-auto pt-4">
                <Button href={resource.link} target="_blank" size="sm" variant="outline">
                  Open source <IconExternal size={14} />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <Card className="mt-8 text-center text-sm text-slate-600">
            No reference matches those filters.
          </Card>
        )}

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle
              eyebrow="Open data & code"
              title="Everything behind this platform is inspectable"
              description="The site code, the knowledge base and the assistant's retrieval corpus are published so that claims can be verified and reused."
            />
            <ul className="mt-5 space-y-3 text-sm">
              {[
                { label: "Source code & deployment config", href: SITE.github },
                { label: "Knowledge base dataset (open)", href: SITE.hfDataset },
                { label: "Static mirror on Hugging Face", href: SITE.hfSpace },
                { label: "Platform status & air tracker bot", href: SITE.botUrl },
              ].map((item) => (
                <li key={item.label}>
                  <a
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 font-semibold text-brand-800 transition hover:border-brand-300"
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {item.label}
                    <IconExternal size={16} />
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <SectionTitle
              eyebrow="How to cite"
              title="Cite the source, not this prototype"
              description="When using a reference, cite the publishing organisation and the original material. CityAir is a navigation aid."
            />
            <pre className="mt-5 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-100">
{`CityAir (independent prototype).
Air-quality readiness & innovation exchange.
aqmx.atikova.com — knowledge base:
huggingface.co/datasets/sosa123454321/amqx-cityair-kb

Demonstration city data is illustrative.
Not an official AQMx / CCAC / WRI / NASA /
XPRIZE product or ranking.`}
            </pre>
            <div className="mt-5">
              <Disclaimer>
                External links are provided for reference only. CityAir does not control, endorse or
                guarantee third-party content, and organisations listed here are not partners.
              </Disclaimer>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
