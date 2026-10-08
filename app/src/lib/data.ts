import citiesJson from "@/data/cities.json";
import guidanceJson from "@/data/guidance.json";
import innovationsJson from "@/data/innovations.json";
import resourcesJson from "@/data/resources.json";
import questionsJson from "@/data/questions.json";
import type {
  City,
  GuidanceDomain,
  Innovation,
  Question,
  ResourceLink,
} from "./types";

export const cities = citiesJson as City[];
export const guidance = guidanceJson as GuidanceDomain[];
export const innovations = innovationsJson as Innovation[];
export const resources = resourcesJson as ResourceLink[];
export const questions = questionsJson as Question[];

export const categories = questions.map((q) => q.category);

export const confidenceItems = [
  "Regulatory monitoring stations",
  "Low-cost sensors",
  "Emissions inventories",
  "Satellite data",
  "Waste-site data",
  "Methane measurements",
  "Health data",
  "Public reporting systems",
  "Verified historical records",
];

export const priorityOptions = [
  "Traffic emissions",
  "Industrial emissions",
  "Household energy",
  "Waste-site emissions",
  "Open waste burning",
  "Landfill methane",
  "Dust",
  "Wildfire smoke",
  "Limited monitoring",
  "Public risk communication",
];

export const regionOptions = [
  "Africa",
  "Asia & Pacific",
  "Europe & Central Asia",
  "Latin America & Caribbean",
  "Middle East & North Africa",
  "North America",
];

export const populationOptions = [
  "< 250k",
  "250k–1M",
  "1M–5M",
  "5M–10M",
  "10M+",
];

export const maturityStages = [
  {
    stage: "1 · Diagnose",
    title: "Frame the problem and the mandate",
    text: "Agree who owns air quality, which pollutants and areas matter most, and which decisions the assessment must support.",
  },
  {
    stage: "2 · Measure",
    title: "Build a trustworthy evidence base",
    text: "Operate quality-assured monitoring, document QA/QC, and combine reference stations, sensors and satellite screening honestly.",
  },
  {
    stage: "3 · Attribute",
    title: "Identify sources and exposure",
    text: "Connect emissions inventories, dispersion analysis and health evidence so measures can target the dominant sources.",
  },
  {
    stage: "4 · Act",
    title: "Prioritise, implement and fund",
    text: "Turn evidence into phased measures with owners, budgets, legal instruments and feedback loops.",
  },
  {
    stage: "5 · Sustain",
    title: "Communicate, evaluate and iterate",
    text: "Publish results in accessible form, evaluate effectiveness, and institutionalise improvement.",
  },
];

export const cityById = (id: string) => cities.find((c) => c.id === id);

export type { City, GuidanceDomain, Innovation, Question, ResourceLink };
export type { MaturityBand } from "./types";
