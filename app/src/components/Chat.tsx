import { useEffect, useMemo, useRef, useState } from "react";
import kbJson from "@/data/kb.json";
import { API_BASE, askAssistant } from "@/lib/api";
import { buildIndex, extractiveAnswer } from "@/lib/retrieval";
import type { ChatMessage, KbChunk } from "@/lib/types";
import { IconChat, IconClose, IconSend, IconSpark } from "./icons";
import { Button, cn } from "./ui";

const kb = kbJson as KbChunk[];

const QUICK_PROMPTS = [
  "How does the readiness assessment scoring work?",
  "What are the maturity stages for air-quality management?",
  "Which innovations address open waste burning?",
  "What does evidence confidence mean?",
  "How do I start a city assessment?",
];

function renderMarkdown(text: string) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5">$1</code>')
    .replace(/^- (.+)$/gm, '<span class="block pl-3">• $1</span>')
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export function useAssistant(assessmentContext?: Record<string, unknown>) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello — I am the CityAir assistant. I answer from the CityAir knowledge base (guidance domains, method, city profiles, innovations and public resources). Ask me anything about city air-quality readiness.",
      ts: Date.now(),
    },
  ]);
  const [busy, setBusy] = useState(false);
  const index = useMemo(() => buildIndex(kb), []);

  const send = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: clean, ts: Date.now() }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await askAssistant(
        next.filter((m) => m.role !== "system").slice(-10),
        assessmentContext,
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          provider: res.provider,
          ts: Date.now(),
        },
      ]);
    } catch {
      const fallback = extractiveAnswer(index, clean);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: fallback.answer,
          sources: fallback.sources,
          provider: "offline-local-retrieval",
          ts: Date.now(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return { messages, busy, send, setMessages, index };
}

export function ChatPanel({
  messages,
  busy,
  onSend,
  className,
  compact,
}: {
  messages: ChatMessage[];
  busy: boolean;
  onSend: (text: string) => void;
  className?: string;
  compact?: boolean;
}) {
  const [value, setValue] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white", className)}>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-brand-950 px-4 py-3 text-white">
        <IconSpark className="text-accent-300" size={18} />
        <div className="flex-1">
          <p className="text-sm font-bold">CityAir Assistant</p>
          <p className="text-[11px] text-brand-100">
            Grounded in the CityAir knowledge base · {kb.length} knowledge chunks
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            API_BASE === "" ? "bg-leaf-500/20 text-leaf-300" : "bg-accent-500/20 text-accent-200",
          )}
        >
          {API_BASE === "" ? "live" : "remote"}
        </span>
      </div>

      <div className={cn("scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4", compact ? "max-h-[46vh]" : "max-h-[60vh]")}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-6",
                m.role === "user"
                  ? "bg-brand-700 text-white"
                  : "border border-slate-200 bg-slate-50 text-brand-950",
              )}
            >
              <div
                className="prose-site"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
              />
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Sources
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {m.sources.slice(0, 4).map((s) => (
                      <li key={s.id} className="text-[11px] text-slate-600">
                        · {s.title}{" "}
                        <span className="text-slate-400">({s.source})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {m.provider && (
                <p className="mt-1 text-[10px] text-slate-400">via {m.provider}</p>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500">
              <span className="animate-pulse-soft">Searching the knowledge base…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
          {QUICK_PROMPTS.slice(0, compact ? 3 : 5).map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSend(prompt)}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-800 hover:border-brand-400"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-slate-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          onSend(value);
          setValue("");
        }}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(value);
              setValue("");
            }
          }}
          rows={2}
          placeholder="Ask about the method, a city, a pollutant, an innovation…"
          className="max-h-32 min-h-[46px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-accent-400 focus:ring-2 focus:ring-accent-100 focus:outline-none"
        />
        <Button type="submit" disabled={busy || !value.trim()} className="h-[46px]">
          <IconSend size={16} />
          <span className="hidden sm:inline">Send</span>
        </Button>
      </form>
    </div>
  );
}

export function ChatWidget({ assessmentContext }: { assessmentContext?: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const { messages, busy, send } = useAssistant(assessmentContext);

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open CityAir assistant"}
        className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-brand-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-brand-800"
      >
        {open ? <IconClose size={18} /> : <IconChat size={18} />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask CityAir AI"}</span>
      </button>

      {open && (
        <div className="no-print fixed bottom-20 right-5 z-40 w-[min(92vw,26rem)] animate-fade-up">
          <ChatPanel
            messages={messages}
            busy={busy}
            onSend={send}
            compact
            className="max-h-[76vh] shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
