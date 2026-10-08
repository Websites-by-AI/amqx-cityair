export type MaturityBand =
  | "Starting"
  | "Developing"
  | "Established"
  | "Advanced"
  | "Leading";

export type AnswerValue = number | "unknown" | "na";

export type Question = {
  id: string;
  category: string;
  question: string;
  weight: number;
};

export type Answer = { value: AnswerValue; evidence?: string; link?: string };

export type CityInfo = {
  name: string;
  country: string;
  region: string;
  population: string;
  context: string;
  concerns: string;
  sectors: string;
  dataSources: string;
  contact: string;
};

export type AssessmentState = {
  city: CityInfo;
  answers: Record<string, Answer>;
  confidence: Record<string, boolean>;
  priorities: string[];
  updatedAt: string;
};

export type AssessmentResult = {
  score: number;
  band: MaturityBand;
  categoryScores: Record<string, number>;
  confidence: number;
  gaps: { category: string; score: number }[];
  limitations: string[];
  completed: number;
};

export type City = {
  id: string;
  name: string;
  country: string;
  region: string;
  population: string;
  band: MaturityBand;
  score: number;
  confidence: number;
  sector: string;
  climate: string;
  lat: number;
  lon: number;
  challenges: string[];
  actions: string[];
  sources: string[];
  scores: Record<string, number>;
};

export type Innovation = {
  id: string;
  title: string;
  status: string;
  sector: string;
  region: string;
  problem: string;
  requiredCapacity: MaturityBand;
  requiredData: string[];
  benefits: string;
  steps: string[];
  risks: string[];
  adaptation: string;
  indicators: string[];
  source: string;
};

export type GuidanceDomain = {
  slug: string;
  category: string;
  summary: string;
  questions: string[];
  actions: string[];
  data: string[];
  resources: string[];
  stages: string[];
};

export type ResourceLink = {
  title: string;
  topic: string;
  organization: string;
  year: number;
  type: string;
  region: string;
  link: string;
  summary: string;
};

export type KbChunk = {
  id: string;
  title: string;
  text: string;
  tags: string[];
  source: string;
};

export type ChatRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  sources?: { id: string; title: string; source: string }[];
  provider?: string;
  ts?: number;
};

export type LiveReading = {
  city: string;
  latitude: number;
  longitude: number;
  pm25: number | null;
  pm10: number | null;
  europeanAqi: number | null;
  usAqi: number | null;
  time: string | null;
};
