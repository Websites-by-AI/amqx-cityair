#!/usr/bin/env node
/**
 * Builds the CityAir knowledge base used by the AI assistant.
 *
 * Inputs : app/src/data/{cities,guidance,innovations,resources,questions}.json
 * Outputs: app/src/data/kb.json                    (bundled into the site + the Worker)
 *          hf/dataset/amqx_cityair_kb.jsonl        (open dataset on Hugging Face)
 *          hf/dataset/data/*.json                  (raw source data, mirrored)
 *
 * Run:  node tools/build-kb.mjs     (or: cd app && npm run kb)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const dataDir = join(root, "app", "src", "data");
const outDir = join(root, "hf", "dataset");

const read = (name) => JSON.parse(readFileSync(join(dataDir, `${name}.json`), "utf8"));

const cities = read("cities");
const guidance = read("guidance");
const innovations = read("innovations");
const resources = read("resources");
const questions = read("questions");

const DOMAINS = [
  "Air Quality Monitoring",
  "Source Attribution",
  "Emissions Inventory",
  "Air Quality Forecasting",
  "Health Impact Assessment",
  "Environmental Impact Assessment",
  "Decision Support",
  "Public Engagement and Communication",
  "Legal Framework and Policy Design",
  "Waste Management",
  "Open Waste Burning",
  "Methane and Landfill Monitoring",
];

/** @type {{id:string,title:string,text:string,tags:string[],source:string}[]} */
const chunks = [];
const add = (id, title, text, tags, source) =>
  chunks.push({ id, title, text: String(text).replace(/\s+/g, " ").trim(), tags, source });

// ---------------------------------------------------------------- platform
add(
  "platform-overview",
  "What CityAir is",
  `CityAir is an independent, open air-quality readiness and innovation-exchange platform for city teams.
It has four core functions: (1) a twelve-domain readiness assessment scored from self-reported answers,
(2) a city explorer with illustrative profiles and live readings, (3) an innovation implementation library
with explainable matching, and (4) an AI assistant grounded in this knowledge base.
CityAir is a prototype. It is not an official product of AQMx, CCAC, WRI, NASA, XPRIZE or the World Health
Organization, it does not rank or certify cities, and demonstration city data is illustrative.`,
  ["overview", "platform", "about", "what is cityair"],
  "CityAir — platform overview",
);

add(
  "platform-disclaimers",
  "Limits, disclaimers and responsible use",
  `CityAir must not be used as a certification, audit, compliance check or official ranking.
Illustrative city scores are synthetic demonstration values and must never be quoted as facts about a real city.
AI answers are machine generated from a prototype knowledge base and can be incomplete or wrong.
Live air-quality readings come from a third-party open API (Open-Meteo) and are model-based, not quality-assured
regulatory measurements. Satellite and remote-sensing products must not be presented as direct methane
quantification or as verification of emission reductions.
Assessment answers stay in the user's browser unless the user explicitly exports them.`,
  ["disclaimer", "limits", "responsible use", "risk"],
  "CityAir — methodology and disclaimers",
);

add(
  "scoring-method",
  "How the readiness score is calculated",
  `Each of the twelve questions belongs to one domain and carries a weight between 0.8 and 1.2.
A scored answer from 0 (absent) to 4 (leading) is normalised: (answer / 4) * 100.
The domain score is the weighted mean of its questions: sum(normalised * weight) / sum(weight).
The overall readiness score is the weighted mean of the domain scores that were actually answered.
Answers marked "unknown" or "not applicable" are excluded from both numerator and denominator, so honest gaps
reduce completeness rather than silently lowering the score.
Maturity bands: Starting 0-34, Developing 35-54, Established 55-69, Advanced 70-84, Leading 85-100.
Scores are planning prompts, not certifications.`,
  ["scoring", "formula", "method", "weights", "band", "maturity"],
  "CityAir — methodology",
);

add(
  "confidence-method",
  "Evidence confidence model",
  `Evidence confidence is a 0-100 figure built from three components:
60% confirmed evidence systems (nine source types: regulatory monitoring stations, low-cost sensors, emissions
inventories, satellite data, waste-site data, methane measurements, health data, public reporting systems,
verified historical records);
25% the share of scored answers that carry an evidence note or link;
15% questionnaire completeness across the twelve domains.
A high score with low confidence is the most common self-assessment failure mode: the practice may exist
informally and not survive staff turnover. Fewer than 60% of domains scored triggers an insufficient-evidence
warning.`,
  ["confidence", "evidence", "quality", "method"],
  "CityAir — methodology",
);

add(
  "five-stages",
  "The five stages of air-quality management capacity",
  `1 Diagnose — frame the problem and the mandate: agree ownership, pollutants, areas and the decisions the
evidence must support.
2 Measure — build a trustworthy evidence base: quality-assured monitoring, documented QA/QC, reference
stations, sensors and satellite screening combined honestly.
3 Attribute — identify sources and exposure: emissions inventories, dispersion analysis and health evidence
so measures can target dominant sources.
4 Act — prioritise, implement and fund: turn evidence into phased measures with owners, budgets, legal
instruments and feedback loops.
5 Sustain — communicate, evaluate and iterate: publish results accessibly, evaluate effectiveness and
institutionalise improvement.`,
  ["stages", "maturity", "process", "framework"],
  "CityAir — method",
);

add(
  "action-plan-logic",
  "How the phased action plan is generated",
  `The action plan uses the lowest-scoring domains and the city's recorded priorities.
Phase 1 (0-6 months) stabilises the evidence base: owners, scope, inventory of existing data, QA/QC and
completeness notes, and a workshop to confirm priorities.
Phase 2 (6-18 months) closes analytical gaps: connect measurements to source attribution, set measurable
indicators per priority sector, prepare a costed funding case, and establish a monthly evidence-decision review.
Phase 3 (18-36 months) scales, communicates and institutionalises: publish an annual progress report, evaluate
delivered measures, re-run the assessment every 12-24 months, and exchange results with peer cities.
Every action needs a named owner, a costed option set, a legal or procurement route, an indicator with a baseline
and a review date.`,
  ["action plan", "phases", "implementation", "budget"],
  "CityAir — action planning",
);

add(
  "who-guidelines",
  "WHO air-quality guideline reference levels",
  `Reference levels (micrograms per cubic metre except CO in mg/m3, from the WHO global air-quality guidelines):
PM2.5 annual: interim targets 35, 25, 15, 10; guideline level 5.
PM2.5 24-hour: interim targets 75, 50, 37.5, 25; guideline level 15.
PM10 annual: interim targets 70, 50, 30, 20; guideline level 15.
PM10 24-hour: interim targets 150, 100, 75, 50; guideline level 45.
Ozone peak season: interim targets 100, 70; guideline level 60. Ozone 8-hour: interim targets 160, 120; level 100.
NO2 annual: interim targets 40, 30, 20; guideline level 10. NO2 24-hour: interim targets 120, 50; level 25.
SO2 24-hour: interim targets 125, 50; guideline level 40. CO 24-hour: interim target 7; guideline level 4.
Always confirm current values with the WHO source before regulatory use.`,
  ["who", "guidelines", "pm2.5", "no2", "ozone", "so2", "co", "benchmark"],
  "CityAir — methodology (WHO reference values)",
);

add(
  "air-quality-basics",
  "Core air-quality concepts used by the platform",
  `PM2.5 and PM10 are particulate matter with diameters below 2.5 and 10 micrometres; the smaller fraction
penetrates deeper into the lungs and bloodstream and dominates health burden in most cities.
NO2 is largely traffic- and combustion-related; ozone is formed photochemically and peaks in warm sunny
conditions; SO2 is associated with sulphur-bearing fuels and some industry; CO comes from incomplete combustion.
Source attribution combines emissions inventories, dispersion and chemical-transport modelling, receptor
modelling, speciation and meteorology. Ambient concentrations depend on emissions plus meteorology and
topography, which is why valleys and basins show severe winter episodes and why dust events must be separated
from managed sources. Exposure is not the same as concentration: it also depends on where people live, work
and travel.`,
  ["pm2.5", "pm10", "no2", "ozone", "so2", "attribution", "exposure", "science"],
  "CityAir — guidance synthesis",
);

// ---------------------------------------------------------------- domains
for (const domain of guidance) {
  add(
    `domain-${domain.slug}`,
    `Guidance domain: ${domain.category}`,
    `${domain.summary}
Guiding questions: ${domain.questions.join(" | ")}.
Recommended actions: ${domain.actions.join(" | ")}.
Data the domain needs: ${domain.data.join(" | ")}.
Maturity sequence: ${domain.stages.join(" -> ")}.
Public references: ${domain.resources.join(", ")}.`,
    ["guidance", "domain", domain.slug, domain.category.toLowerCase()],
    "CityAir — guidance domains",
  );
}

// ---------------------------------------------------------------- questions
for (const question of questions) {
  add(
    `question-${question.id}`,
    `Assessment question (${question.category})`,
    `${question.question} This question belongs to the domain "${question.category}" and carries weight
${question.weight} in that domain's score. It is answered on a 0-4 scale, or marked unknown / not applicable.`,
    ["assessment", "question", question.category.toLowerCase(), question.id],
    "CityAir — question set",
  );
}

// ---------------------------------------------------------------- cities
for (const city of cities) {
  const scores = Object.entries(city.scores)
    .map(([key, value]) => `${key} ${value}`)
    .join(", ");
  add(
    `city-${city.id}`,
    `City profile: ${city.name}, ${city.country}`,
    `${city.name} (${city.country}, ${city.region}, population ${city.population}) is profiled with an
illustrative readiness score of ${city.score} (${city.band} band) and evidence confidence ${city.confidence}.
Climate and topography: ${city.climate}. Dominant sector of concern: ${city.sector}.
Documented challenges: ${city.challenges.join("; ")}.
Actions under consideration: ${city.actions.join("; ")}.
Domain scores: ${scores}.
Sources: ${city.sources.join("; ")}.
These values are illustrative demonstration data created for the prototype and must not be cited as an
official assessment of ${city.name}.`,
    ["city", "profile", city.name.toLowerCase(), city.country.toLowerCase(), city.region.toLowerCase()],
    "CityAir — illustrative city library",
  );
}

// ---------------------------------------------------------------- innovations
for (const innovation of innovations) {
  add(
    `innovation-${innovation.id}`,
    `Innovation brief: ${innovation.title}`,
    `Sector: ${innovation.sector}. Status: ${innovation.status}. Region: ${innovation.region}.
Problem addressed: ${innovation.problem}
Required capacity: ${innovation.requiredCapacity}. Required data: ${innovation.requiredData.join("; ")}.
Benefits: ${innovation.benefits}
Delivery steps: ${innovation.steps.join(" -> ")}.
Risks to manage: ${innovation.risks.join("; ")}.
Adaptation note: ${innovation.adaptation}
Monitoring indicators: ${innovation.indicators.join("; ")}.
Source: ${innovation.source}`,
    ["innovation", "solution", innovation.sector.toLowerCase(), innovation.id, innovation.title.toLowerCase()],
    "CityAir — innovation library",
  );
}

// ---------------------------------------------------------------- resources
for (const resource of resources) {
  add(
    `resource-${resource.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
    `Public resource: ${resource.title}`,
    `${resource.title} — ${resource.organization} (${resource.year}), type: ${resource.type}, region:
${resource.region}. ${resource.summary} Link: ${resource.link}`,
    ["resource", "reference", resource.topic.toLowerCase(), resource.organization.toLowerCase()],
    "CityAir — public resources",
  );
}

// ---------------------------------------------------------------- FAQ
add(
  "faq-where-data",
  "Where is assessment data stored?",
  `Assessment answers, evidence notes and priorities are stored only in your browser's localStorage under the
key cityair-assessment-v1. Nothing is uploaded unless you export the JSON file or explicitly send a summary to
the AI assistant. There are no accounts and no third-party analytics.`,
  ["data", "privacy", "storage", "localstorage", "gdpr"],
  "CityAir — platform",
);

add(
  "faq-ai-architecture",
  "How the AI assistant is built",
  `The assistant retrieves the most relevant passages from the published CityAir knowledge base (BM25 keyword
retrieval with an embeddings rerank where an inference provider is available), then asks a language model to
answer only from those passages and returns the passages it used as sources. If the language model is
unavailable, the assistant returns the retrieved passages verbatim instead of inventing an answer, so the
service degrades to a search interface rather than failing or hallucinating.
The knowledge base is published as an open dataset on Hugging Face, and the API runs as a Cloudflare Worker.`,
  ["ai", "assistant", "rag", "architecture", "api", "worker", "hugging face"],
  "CityAir — platform",
);

add(
  "faq-telegram-bot",
  "The Telegram air tracker bot",
  `The companion Telegram bot reports current PM2.5, PM10 and European AQI for any city using the open
Open-Meteo air-quality API, answers knowledge-base questions, and links back to the platform. Commands:
/start, /aqi <city>, /city <name>, /ask <question>, /help, /about. Readings are model-based and are not
quality-assured regulatory measurements.`,
  ["telegram", "bot", "air tracker", "commands"],
  "CityAir — platform",
);

add(
  "faq-compare-cities",
  "Comparing cities fairly",
  `City profiles use the same twelve domains so comparisons are structurally fair, but context differs:
baseline meteorology, topography, industrial history and data availability all shape what is achievable.
A lower score in a difficult setting can represent more honest reporting than a higher score with weak evidence,
which is exactly why the evidence-confidence figure accompanies every score. Comparisons are for peer learning,
not league tables.`,
  ["compare", "cities", "benchmark", "equity"],
  "CityAir — guidance synthesis",
);

add(
  "faq-start",
  "How to start using CityAir",
  `1 Read the twelve guidance domains to understand what capacity looks like.
2 Open the assessment and complete city context, then score the domains you can evidence.
3 Review the readiness dashboard: score, band, evidence confidence and priority gaps.
4 Generate the phased action plan and attach owners, costs and review dates.
5 Use innovation matching to find implementation options that fit your capacity.
6 Ask the assistant to explain any result, and re-run the assessment every 12-24 months.`,
  ["start", "how to", "workflow", "onboarding"],
  "CityAir — platform",
);

// ---------------------------------------------------------------- expo (ISAF Smartex 2026)
const expoPath = join(dataDir, "expo.json");
if (existsSync(expoPath)) {
  const expo = JSON.parse(readFileSync(expoPath, "utf8"));
  const e = expo.event;

  add(
    "expo-smartex-2026",
    "ISAF Smartex 2026 (Istanbul smart-city fair) — event facts",
    `${e.name}. Co-located event: ${e.coEvent}. Editions: ${e.edition}.
Dates: ${e.start} to ${e.end} at ${e.venue}, ${e.address}. Halls: ${e.halls}.
Organiser: ${e.organizer} (${e.organizerSite}). Official site: ${e.officialSite}.
Scale as published: ${e.scale.map((s) => `${s.label}: ${s.value}`).join("; ")}.
Thematic tracks: ${e.themes.join(", ")}.
Co-located fairs under one ticket: ${e.coLocated.join("; ")}.
Why it matters for CityAir: ${e.whyItMatters}
Sources: ${e.sources.map((s) => `${s.label} (${s.url})`).join(" | ")}.
Verification note: public directories publish only part of the exhibitor list and stands change on site, so every company entry is labelled either "At the fair" (found in a published exhibitor directory) or "Ecosystem target" (not confirmed).`,
    ["expo", "istanbul", "smartex", "isaf", "fair", "2026", "smart city", "venue"],
    "CityAir — ISAF Smartex 2026 cooperation brief",
  );

  add(
    "expo-cooperation-models",
    "Cooperation models with CityAir and the AQMx pathway (ISAF Smartex 2026)",
    expo.cooperationModels
      .map(
        (m) =>
          `${m.title}: WITH CITYAIR — ${m.forUs} WITH AQMX — ${m.forAqmX} WE ASK — ${m.ask} WE GIVE — ${m.give}`,
      )
      .join("\n\n") +
      `\n\nImportant: the AQMx column describes how a company COULD contribute to the AQMx knowledge exchange. CityAir is an independent prototype, is not an AQMx product, and has no authority to approve or speak for AQMx.`,
    ["expo", "cooperation", "partnership", "aqmx", "models", "sponsorship", "pilot"],
    "CityAir — ISAF Smartex 2026 cooperation brief",
  );

  for (const company of expo.companies) {
    add(
      `expo-company-${company.id}`,
      `Expo company: ${company.name}`,
      `${company.name} (${company.country}, ${company.sector}). Status: ${company.presence} — category: ${
        company.group === "exhibitor" ? "at the fair (published exhibitor directory)" : "ecosystem target (presence to verify)"
      }.
What they do: ${company.whatTheyDo}
Air-quality angle: ${company.aqAngle}
Proposed cooperation with CityAir: ${company.withCityAir}
Proposed pathway to the AQMx exchange: ${company.withAqmX}
Priority: ${company.priority} (A = fastest route to a published result, C = opportunistic). Route in: ${company.contact}.`,
      ["expo", "company", "smartex", company.sector.toLowerCase(), ...company.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3).slice(0, 3)],
      "CityAir — ISAF Smartex 2026 company map",
    );
  }

  add(
    "expo-outreach-kit",
    "Fair outreach kit: booth script, follow-up and field checklist",
    `${expo.templates.map((t) => `${t.label}: ${t.body}`).join("\n\n")}
\n\nField checklist: ${expo.outreachChecklist.join(" | ")}`,
    ["expo", "outreach", "template", "email", "booth", "follow-up", "turkish", "persian"],
    "CityAir — ISAF Smartex 2026 cooperation brief",
  );
}

// ---------------------------------------------------------------- partners, outreach & archive
const partnersPath = join(dataDir, "partners.json");
if (existsSync(partnersPath)) {
  const partners = JSON.parse(readFileSync(partnersPath, "utf8"));

  add(
    "partners-clean-air-dialogue-2026",
    "International Clean Air Dialogue, Istanbul (23–24 Sep 2026) — event facts",
    `Two-day international meeting co-organised by UNECE (Convention on Long-range Transboundary Air Pollution), UNEP, the Climate and Clean Air Coalition (CCAC), the Forum for International Cooperation on Air Pollution and the Government of Türkiye, with support from the EU and the UN; a side event of the 7th International Day of Clean Air for blue skies. Venue: Dedeman İstanbul Hotel, Istanbul. Dates: 23–24 September 2026.
Day 1 covered the global air-pollution landscape, the session "Advancing clean air action" with UNEP, WHO, the CCAC Secretariat and the United Kingdom, and a science-policy session with WMO, AirQo (Uganda), Morocco, Saudi Arabia, UNESCAP, EANET, Brazil and South Africa.
Day 2 covered transport (ADB, UNECE), unlocking investment for clean air, and Session 6 "Communicating air quality information to the public: from data to action" — the session most relevant to this platform, since it is about turning air-quality data into public action.
CityAir's role: attended as a participant; the AQMx-side contact was made here and the first prototype pages were demonstrated.
Sources: ${partners.milestones[0].sources.map((s) => `${s.label} (${s.url})`).join(" | ")}.`,
    ["partners", "dialogue", "istanbul", "unece", "unep", "ccac", "2026", "clean air", "event"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-movegreen",
    "MoveGreen (Kyrgyzstan) — pilot partner in discussion, and what they bring",
    `MoveGreen is a youth environmental movement in Kyrgyzstan; Maria Kolesnikova coordinates its Air Quality Programme and is a UNEP Champion of the Earth (2021, Entrepreneurial Vision). MoveGreen runs 100+ PM sensors in Bishkek and the region, the AQ.kg (Aba.kg) public air-quality app covering about twelve cities with PM2.5, PM10 and NO2, the Central Asian Air Quality Platform, and the "School Breathes Easily" programme, and works on Bishkek landfill fires and waste-management financing.
Status of the conversation (as recorded on 7 October 2026): a positive reply was received. MoveGreen states that methane monitoring is NOT currently a specific area of their work, while offering strong experience in independent air-quality monitoring, environmental data, citizen engagement, public communication and advocacy. They identify the best route as building the methane component together with a technical partner, and rate four things as particularly relevant: validating Earth-observation and remote-sensing data with ground-based monitoring, identifying environmental risk hotspots, developing an air-quality baseline, and engaging local stakeholders.
Important: this is an expression of interest, NOT a signed partnership. CityAir must not describe MoveGreen as a partner until there is a written agreement.`,
    ["partners", "movegreen", "kyrgyzstan", "bishkek", "pilot", "sensors", "aq.kg", "contact", "reply"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-aqmx-outreach",
    "AQMx-side contact (Juliet) and the AQMx alignment pathway",
    `At the International Clean Air Dialogue in Istanbul a contact on the AQMx side (referred to as Juliet) discussed how AQMx serves cities with air-quality data and guidance, and the idea of replicating a similar model for waste. The prototype pages built during that conversation were received positively, and a follow-up was agreed for when the contact travels to France and Germany.
UNVERIFIED: the person's exact name, role and affiliation are not confirmed in writing. Do not state or imply any affiliation on their behalf, and do not present this as an AQMx endorsement.
Alignment pathway (CityAir's understanding, subject to AQMx's own decision): CityAir's twelve assessment domains map onto AQMx's guidance areas; CityAir's five maturity stages follow the same stages-of-capacity logic published by AQMx; the waste workstream lands on AQMx's sectoral guidance "Eliminating Open Waste Burning" and the waste-management sector guide; the AQMx interactive questionnaire is the closest existing instrument, so a Bishkek run could be done with both instruments and the two results compared openly; the natural submission route is the AQMx resource exchange library. Whether AQMx lists, indexes or accepts anything is AQMx's decision alone.
Sources: ${partners.contacts.find((c) => /Juliet/i.test(c.contact)).links.map((l) => `${l.label} (${l.url})`).join(" | ")}.`,
    ["partners", "aqmx", "juliet", "alignment", "waste", "questionnaire", "exchange library", "unverified"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-xprize-mission-methane",
    "XPRIZE Mission Methane — what the competition is and how CityAir fits",
    `XPRIZE Mission Methane targets diffuse, low-concentration methane emissions that conventional mitigation misses — landfills, wastewater systems, agriculture, wetlands and the atmosphere — across four intervention categories: prevention, mitigation, destruction and atmospheric removal. It is modelled on the proven XPRIZE Carbon Removal structure and, at the time of writing, sits in the partner-development phase; prize fund, timeline and final criteria are whatever XPRIZE announces, and must never be presented as fixed.
CityAir's fit: the evidence layer, not the technology. Ground-validated hotspot detection (matching satellite and thermal alerts against sensor networks and publishing the false-positive rate), a documented methane and PM2.5 baseline that separates measured from modelled from unknown, an independent evaluation method with confidence scoring, a civil-society partner for community data, and open publication of method and data so a reviewer can reproduce the result.
Sequencing: confirm one technical partner and one civil-society partner first (MoveGreen is the candidate), produce one documented pilot result, then approach the official channel. No announcement before the first published output.
Source: https://www.xprize.org/competitions/methane`,
    ["partners", "xprize", "methane", "landfill", "waste", "competition", "baseline", "pilot"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-outgoing-letter-movegreen",
    "Outgoing message to MoveGreen (7 October 2026, 18:46)",
    `The full text of the outreach message CityAir sent to MoveGreen on 7 October 2026 at 18:46, addressed to Mr. Muradyl, is archived on the partnerships page of this site (route #/partners, section "Archive") and is downloadable there as .txt and .md. It is published in full because it is CityAir's own outgoing message.
Summary of its content: it introduces GreenHope and the partner-development concept for XPRIZE Mission Methane; describes the platform (satellite Earth observation, Sentinel-2 imagery, NASA FIRMS active-fire data, thermal anomaly detection, field sensors and public air-quality information); explains the focus on diffuse methane from landfills, waste-management systems and wastewater facilities; and lists five asks — (1) validate satellite and thermal alerts with ground air-quality sensors, (2) monitor waste-burning, landfill and environmental-risk hotspots, (3) develop a baseline for methane and PM2.5, (4) connect with a waste-management company or landfill operator, (5) support responsible media engagement and public communication — ending with a request to send a short non-confidential one-page concept note and arrange a brief introductory call.`,
    ["partners", "letter", "movegreen", "outreach", "email", "archive", "xprize"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-cop31-2026",
    "COP31 (Antalya, 9–20 November 2026) and the green start-up track",
    `The 31st UN Climate Change Conference is held in Türkiye at Antalya Expo Center from 9 to 20 November 2026, with Türkiye holding the presidency (COP President: Murat Kurum) and Australia presiding over negotiations (Chris Bowen); the World Leaders' Summit meets 11–12 November. A green start-up AI model has been registered under the author's name for the COP31 innovation track.
CityAir's preparation: the waste-and-methane workstream is designed to have one documented pilot result before the conference opens, so any statement made at COP31 is backed by a published evidence trail rather than an intention.
Source: https://www.cisl.cam.ac.uk/cop-climate-change-conference/cop31-antalya-turkiye-9-20-november-2026`,
    ["partners", "cop31", "antalya", "2026", "climate", "startup", "milestone", "türkiye"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-archive-coverage",
    "Archive coverage audit — how complete the correspondence archive is (percentages)",
    `The archive is audited with five weighted criteria per document: metadata 20% (date, time, channel, from, to, subject), message body 40% (verbatim 100, translated 95, private 60, summary 50, partial 35, missing 0), attachments and links 15%, status and next step 15%, privacy labelling 10%. A document's score is the weighted sum; the overall figure is the mean of all documents. The audit is reproducible: node tools/archive-coverage.mjs regenerates it.
Current result: ${partners.coverageSummary.overallPercent}% overall across ${partners.coverageSummary.documents} documents — ${partners.coverageSummary.completeDocuments} complete at 100%, ${partners.coverageSummary.partialDocuments} with gaps, ${partners.coverageSummary.privateOnlyDocuments} whose full text is stored privately rather than published.
Per document: ${partners.coverageSummary.perDocument.map((d) => `${d.subject} — ${d.percent}%`).join("; ")}.
${partners.coverageSummary.gapCount} gaps are registered, of which ${partners.coverageSummary.gapsOurs} can be closed by an action on our side. Key gaps: the full text of the MoveGreen reply is private pending written permission; the copy we hold of that reply ends mid-sentence; the exact name, role and affiliation of the AQMx-side contact are unverified; no reply has yet arrived to the message of 7 October 18:46; no offline snapshot exists of the linked pages; the original Telegram screenshots were not saved as images; and the Persian/Russian versions of the concept note have not been made.
How to read this: the percentage measures archive completeness, NOT partnership progress. Zero percent of this page is a signed partnership — every document records a status, not a promise.`,
    ["partners", "coverage", "percentage", "audit", "archive", "gaps", "90 percent", "private"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-concept-note",
    "Concept note for MoveGreen — the promised one-page document (draft, ready to send)",
    `The non-confidential one-pager offered in the message of 7 October 2026 now exists as an A4 PDF in English: docs/partners/cityair-movegreen-concept-note.pdf (plus PNG and the HTML source).
Its content: the idea in three sentences (satellite and thermal alerts already flag burning and hotspots around Bishkek but nobody has published how often those alerts are right; MoveGreen has a real ground network and public trust; pairing the two produces a defensible answer for the city and a method other cities can copy); what the pilot produces in 90 days (a validation note including the false-positive rate, a hotspot register with provenance for every entry, and a baseline statement that keeps measured, modelled and unknown apart, with methane handled as a measurement plan rather than a satellite number); the division of work (MoveGreen brings the ground network and its data, local knowledge, citizen engagement, communication and convening power; CityAir brings the method, the publishing layer, the twelve-domain assessment and open data); the five asks (one pilot district and a named focal point, historical PM data, one introduction to a waste or university partner, written publication agreement with MoveGreen holding veto over its own network, and about two hours a week of one person's time); the data, privacy and publication rules; and the honest status line that nothing is agreed, funded or announced.
A PDF of the note is available on the partnerships page under the archive section.`,
    ["partners", "concept note", "movegreen", "one page", "pilot", "pdf", "waste", "methane", "ready to send"],
    "CityAir — partnerships and outreach archive",
  );

  add(
    "partners-cooperation-plan",
    "Cooperation plan with MoveGreen — five workstreams, 90-day map, asks and risks",
    `Principle: MoveGreen is the local evidence authority; CityAir is the technical and publishing layer. Neither side claims the other's work, and every published number carries its method and its limits.
Five workstreams: (1) validate Earth-observation and thermal alerts with ground sensors — deliver a validation note including the false-positive rate (weeks 1–6); (2) map waste-burning and landfill environmental-risk hotspots into a public register with provenance for every entry (weeks 1–8); (3) develop the methane and PM2.5 baseline as a baseline statement that separates measured, modelled and unknown (weeks 4–12); (4) connect a waste-management or landfill operator and sign a site-level data agreement (weeks 4–14); (5) responsible public communication and citizen engagement, led by MoveGreen, with trilingual materials and the Telegram bot for field reports (weeks 6–14).
CityAir adds: the twelve-domain readiness assessment producing the first fully evidenced Bishkek record, evidence-confidence scoring, innovation briefs with required data and risks, public dashboard templates and print exports, and open publication of the knowledge base and method.
MoveGreen brings: the 100+ sensor PM network, the AQ.kg app and its audience, citizen-engagement capacity, media and advocacy reach, and convening power through the Central Asian Air Quality Platform.
Ninety-day map: days 1–14 send the concept note, hold the introductory call, agree the pilot district and focal points, confirm data-sharing terms in writing; days 15–45 run the EO-versus-ground validation on historical data, draft the hotspot register, open the waste-operator conversation; days 46–90 publish the validation note and baseline statement, deliver the communication pack, package the case study for the AQMx exchange and COP31.
Five asks: one pilot district with a named focal point; historical PM data for that district; one introduction to a waste-management or landfill operator; written agreement on what may be published (MoveGreen holds veto over anything describing their own network); two hours per week of technical time from one staff member.
Risks and mitigations: methane is not MoveGreen's current workstream and could overload a small team — CityAir carries the methane method; satellite alerts are already over-claimed in this field — publish the false-positive rate and state that remote sensing screens rather than quantifies; a premature partnership announcement damages both sides — no announcement before the first published output; third-party personal data could leak into a public repository — publish roles and organisational contacts only.`,
    ["partners", "cooperation", "movegreen", "plan", "90 days", "asks", "risks", "baseline", "hotspots"],
    "CityAir — partnerships and outreach archive",
  );
}

// ---------------------------------------------------------------- outputs
const kbPath = join(dataDir, "kb.json");
writeFileSync(kbPath, JSON.stringify(chunks, null, 1));
// keep a copy next to the Worker so it can be bundled without reaching outside its project dir
writeFileSync(join(root, "worker", "src", "kb.json"), JSON.stringify(chunks, null, 1));

mkdirSync(outDir, { recursive: true });
mkdirSync(join(outDir, "data"), { recursive: true });

const jsonl = chunks
  .map((chunk) => JSON.stringify({ ...chunk, tags: chunk.tags }))
  .join("\n");
writeFileSync(join(outDir, "amqx_cityair_kb.jsonl"), `${jsonl}\n`);

writeFileSync(
  join(outDir, "cities.csv"),
  [
    "id,name,country,region,population,band,score,confidence,sector,climate,lat,lon," +
      Object.keys(cities[0].scores).join(","),
    ...cities.map((city) =>
      [
        city.id,
        city.name,
        city.country,
        city.region,
        city.population,
        city.band,
        city.score,
        city.confidence,
        city.sector,
        city.climate,
        city.lat,
        city.lon,
        ...Object.values(city.scores),
      ]
        .map((value) => (typeof value === "string" && value.includes(",") ? `"${value}"` : value))
        .join(","),
    ),
  ].join("\n"),
);

for (const name of ["cities", "guidance", "innovations", "resources", "questions", "expo", "partners"]) {
  copyFileSync(join(dataDir, `${name}.json`), join(outDir, "data", `${name}.json`));
}
copyFileSync(kbPath, join(outDir, "amqx_cityair_kb.json"));

const bySource = chunks.reduce((acc, chunk) => {
  acc[chunk.source] = (acc[chunk.source] ?? 0) + 1;
  return acc;
}, {});

console.log(`kb.json written: ${chunks.length} chunks`);
for (const [source, count] of Object.entries(bySource)) console.log(`  ${count.toString().padStart(3)} · ${source}`);
if (!existsSync(kbPath)) process.exit(1);
