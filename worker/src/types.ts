export type KbChunk = {
  id: string;
  title: string;
  text: string;
  tags: string[];
  source: string;
};

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type Env = {
  ASSETS?: Fetcher;
  AI?: { run: (model: string, input: unknown) => Promise<unknown> };
  AMQX_KV?: KVNamespace;
  DB?: D1Database;
  SITE_URL?: string;
  SITE_NAME?: string;
  BOT_USERNAME?: string;
  AI_MODEL?: string;
  HF_MODEL?: string;
  HF_TOKEN?: string;
  KB_VERSION?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ADMIN_KEY?: string;
  ADMIN_NAME?: string;
  ADMIN_PASSWORD_SALT?: string;
  ADMIN_PASSWORD_SHA256?: string;
};

export type Scored = { chunk: KbChunk; score: number };
