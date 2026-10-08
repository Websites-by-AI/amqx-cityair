import { maturityStages } from "@/lib/data";
import { SITE } from "@/components/layout";
import {
  Bullets,
  Button,
  Card,
  Disclaimer,
  PageHero,
  SectionTitle,
  Stat,
} from "@/components/ui";

export default function About() {
  return (
    <>
      <PageHero
        eyebrow="Independent initiative"
        title="About CityAir"
        description="A technical prototype for turning fragmented city evidence into accountable air-quality and waste-system action — with the limits stated openly."
      />

      <section className="container-page py-12">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <Card>
            <SectionTitle
              eyebrow="Purpose"
              title="A bridge from evidence to implementation"
              description="CityAir explores how local authorities, researchers and communities can assess capacity, prioritise evidence gaps, exchange implementation knowledge and track practical progress."
            />
            <div className="prose-site mt-5 space-y-4 text-sm leading-7 text-slate-600">
              <p>
                Most cities do not fail on ambition; they fail on connection. Monitoring data sits
                in one agency, health evidence in another, permits in a third, and the budget
                decision happens before any of them are aligned. CityAir's contribution is a
                workflow that makes those connections explicit, gradeable and repeatable.
              </p>
              <p>
                The platform deliberately avoids ranking cities. It produces a diagnosis of
                capacity, an evidence-confidence figure and a phased plan that a city team can take
                into its own governance process. Everything that could be mistaken for an official
                judgement is labelled as illustrative.
              </p>
              <p>
                The AI assistant exists to make the method and the library usable in practice: it
                answers from the platform's own published knowledge base and shows which passages it
                used, so a reviewer can check the claim rather than trust the model.
              </p>
            </div>
            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              <Stat value="12" label="Guidance domains" tone="accent" />
              <Stat value="20" label="Illustrative city profiles" tone="brand" />
              <Stat value="3" label="Languages planned for the bot" tone="leaf" />
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="font-bold text-brand-950">Principles</h2>
              <div className="mt-3">
                <Bullets
                  items={[
                    "City-led: local mandates and priorities stay central.",
                    "Interoperable: connect existing evidence systems rather than replace them.",
                    "Transparent: confidence, limits and provenance remain visible.",
                    "Co-created: methods should be validated with practitioners and communities.",
                  ]}
                />
              </div>
            </Card>
            <Card>
              <h2 className="font-bold text-brand-950">The five stages</h2>
              <ol className="mt-3 space-y-3 text-sm">
                {maturityStages.map((stage) => (
                  <li key={stage.stage}>
                    <p className="text-xs font-bold uppercase tracking-wide text-accent-600">
                      {stage.stage}
                    </p>
                    <p className="font-semibold text-brand-900">{stage.title}</p>
                    <p className="text-slate-600">{stage.text}</p>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>

        <div className="mt-10">
          <SectionTitle
            eyebrow="Potential cooperation — not partnership claims"
            title="What collaboration could look like, subject to written agreements"
            description="No organisation named anywhere on this site is a confirmed partner, funder, endorser or selector unless a future written announcement says so explicitly."
          />
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Cities and local authorities",
                text: "Co-design workflows, verify local data and test action planning.",
              },
              {
                title: "Universities and civil society",
                text: "Review methods, support participation and evaluate equity and impact.",
              },
              {
                title: "Waste operators and technical providers",
                text: "Validate operational data, feasibility, safety and monitoring indicators.",
              },
              {
                title: "Public knowledge initiatives",
                text: "Explore interoperability with public frameworks and open datasets.",
              },
              {
                title: "Climate and clean-air organisations",
                text: "Exchange learning and review the method against established practice.",
              },
              {
                title: "Science and innovation communities",
                text: "Reference public open data and avoid any implied endorsement.",
              },
            ].map((item) => (
              <Card key={item.title} as="article">
                <h3 className="font-bold text-brand-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionTitle eyebrow="Open by default" title="Code, data and knowledge base" />
            <ul className="mt-5 space-y-3 text-sm">
              <li>
                <a
                  className="font-semibold text-brand-700 underline"
                  href={SITE.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  Source code and deployment configuration (GitHub)
                </a>
              </li>
              <li>
                <a
                  className="font-semibold text-brand-700 underline"
                  href={SITE.hfDataset}
                  target="_blank"
                  rel="noreferrer"
                >
                  Knowledge base dataset (Hugging Face, open)
                </a>
              </li>
              <li>
                <a
                  className="font-semibold text-brand-700 underline"
                  href={SITE.hfSpace}
                  target="_blank"
                  rel="noreferrer"
                >
                  Static mirror of this site (Hugging Face Space)
                </a>
              </li>
            </ul>
            <div className="mt-5">
              <Button href="#/methodology" variant="outline">
                Read the full methodology
              </Button>
            </div>
          </Card>

          <Card>
            <SectionTitle eyebrow="Contact" title="Corrections, data errors, cooperation" />
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Report factual errors, broken links or methodological concerns through the public
              repository issue tracker, or contact the maintainer at{" "}
              <a className="font-semibold text-brand-700 underline" href={`mailto:${SITE.contactEmail}`}>
                {SITE.contactEmail}
              </a>
              . Substantive corrections are documented in the changelog with their rationale.
            </p>
            <div className="mt-5">
              <Disclaimer>
                <strong className="block">Independence statement</strong>
                CityAir is an independent prototype. It is not an official AQMx, CCAC, WRI, NASA or
                XPRIZE product, it does not claim their endorsement, and it uses their names only to
                point to publicly available resources. Demonstration city data and scores are
                illustrative and are not official rankings.
              </Disclaimer>
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}
