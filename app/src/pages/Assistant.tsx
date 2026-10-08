import { useEffect, useState } from "react";
import { getHealth, type Health } from "@/lib/api";
import { ChatPanel, useAssistant } from "@/components/Chat";
import { SITE } from "@/components/layout";
import { Badge, Bullets, Button, Card, Disclaimer, PageHero, SectionTitle } from "@/components/ui";
import { IconExternal, IconSpark } from "@/components/icons";
import kbJson from "@/data/kb.json";
import type { KbChunk } from "@/lib/types";

const kb = kbJson as KbChunk[];

/** Inline chat used by the Results page so the assistant can explain the dashboard. */
export function CityAirChatInline({
  seed,
  context,
  title = "Ask the assistant about these results",
}: {
  seed?: string;
  context?: Record<string, unknown>;
  title?: string;
}) {
  const { messages, busy, send } = useAssistant(context);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-accent-600">AI assistant</p>
          <h2 className="mt-1 text-xl font-extrabold text-brand-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Answers are grounded in the CityAir knowledge base and can cite what they used. Verify
            anything decision-critical against the original source.
          </p>
        </div>
        {seed && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => send(seed.replace(/\{(\w+)\}/g, (_, k) => String((context ?? {})[k] ?? `{${k}}`)))}
          >
            <IconSpark size={15} /> Explain my dashboard
          </Button>
        )}
      </div>
      <div className="mt-5">
        <ChatPanel messages={messages} busy={busy} onSend={send} className="h-[26rem]" />
      </div>
    </Card>
  );
}

export default function Assistant() {
  const seeded = sessionStorage.getItem("cityair-assistant-seed") ?? undefined;
  const { messages, busy, send } = useAssistant();
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    sessionStorage.removeItem("cityair-assistant-seed");
    const controller = new AbortController();
    getHealth(controller.signal).then(setHealth);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (seeded) send(seeded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sources = Array.from(new Set(kb.map((chunk) => chunk.source)));

  return (
    <>
      <PageHero
        eyebrow="AI assistant"
        title="Ask questions grounded in the CityAir knowledge base"
        description="The assistant retrieves relevant passages from the platform's own knowledge base, then answers with an LLM and lists the passages it used. If the language model is unavailable, it returns the retrievals verbatim instead of inventing an answer."
      >
        <div className="flex flex-wrap gap-3">
          <Button href="#/assess" variant="outline" className="bg-white/95">
            Assess a city first
          </Button>
          <Button href={SITE.hfDataset} target="_blank" variant="ghost" className="text-white hover:bg-white/10">
            Inspect the knowledge base <IconExternal size={15} />
          </Button>
        </div>
      </PageHero>

      <section className="container-page py-10">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <ChatPanel messages={messages} busy={busy} onSend={send} className="h-[34rem]" />

          <div className="space-y-5">
            <Card>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-brand-950">Service status</h2>
                <Badge tone={health ? (health.ok ? "leaf" : "sun") : "slate"}>
                  {health ? (health.ok ? "online" : "degraded") : "unknown"}
                </Badge>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">API provider</dt>
                  <dd className="font-semibold text-brand-900">
                    {health?.providers.cloudflareAi
                      ? "Cloudflare Workers AI"
                      : health?.providers.huggingFace
                        ? "Hugging Face Inference"
                        : health
                          ? "extractive fallback"
                          : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Knowledge chunks</dt>
                  <dd className="font-semibold text-brand-900">
                    {health?.kbChunks ?? kb.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Telegram bot</dt>
                  <dd className="font-semibold text-brand-900">
                    {health?.telegram.username ? `@${health.telegram.username}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Version</dt>
                  <dd className="font-semibold text-brand-900">{health?.version ?? "static build"}</dd>
                </div>
              </dl>
              {health?.telegram.webhook && (
                <p className="mt-3 rounded-lg bg-leaf-50 px-3 py-2 text-xs text-leaf-800">
                  Webhook registered: {health.telegram.webhook}
                </p>
              )}
            </Card>

            <Card>
              <h2 className="font-bold text-brand-950">What it is good at</h2>
              <div className="mt-3">
                <Bullets
                  items={[
                    "Explaining how the readiness score and evidence confidence are calculated",
                    "Summarising a guidance domain and the data it needs",
                    "Describing what an innovation brief requires before adoption",
                    "Pointing to the public resources behind a claim",
                  ]}
                  tone="leaf"
                />
              </div>
              <h2 className="mt-6 font-bold text-brand-950">What it will not do</h2>
              <div className="mt-3">
                <Bullets
                  items={[
                    "Certify, rank, audit or approve a city",
                    "Produce official emission or exposure figures",
                    "Replace legal, medical, engineering or procurement advice",
                    "Answer outside its knowledge base without saying so",
                  ]}
                />
              </div>
            </Card>

            <Card>
              <h2 className="font-bold text-brand-950">Knowledge base coverage</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {sources.map((source) => (
                  <span
                    key={source}
                    className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    {source}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                {kb.length} chunks · published as an open dataset so anyone can audit the retrieval
                corpus. See{" "}
                <a className="font-semibold text-brand-700 underline" href={SITE.hfDataset} target="_blank" rel="noreferrer">
                  the Hugging Face dataset
                </a>
                .
              </p>
            </Card>

            <Disclaimer>
              Assistant answers are machine-generated from a prototype knowledge base and may be
              incomplete or wrong. Nothing here is official guidance, and no dependency on any
              organisation should be inferred.
            </Disclaimer>
          </div>
        </div>

        <div className="mt-12">
          <SectionTitle
            eyebrow="Also available on Telegram"
            title={`Talk to @${SITE.botUsername}`}
            description="The same knowledge base and live readings are reachable from Telegram, which is often faster on mobile networks during field work."
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href={SITE.botUrl} target="_blank">
              Open the bot in Telegram
            </Button>
            <Button href="#/cities" variant="outline">
              See live city readings
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
