"use client";

import * as React from "react";
import { ArrowRight, Send, FileText, HelpCircle, Layers } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { Course, Video, ChatMessage } from "@/lib/types";
import { leapReply, leapWelcome, LeapAction } from "@/lib/mock/leapAI";
import { cn } from "@/lib/utils";

const quickActions: { label: string; action: Exclude<LeapAction, undefined>; icon: typeof FileText }[] = [
  { label: "Summarize", action: "summarize", icon: FileText },
  { label: "Quiz me", action: "quiz", icon: HelpCircle },
  { label: "Explain deeper", action: "deeper", icon: Layers },
];

function labelFor(a?: LeapAction) {
  return a === "summarize"
    ? "Summarize this lesson"
    : a === "quiz"
      ? "Quiz me on this lesson"
      : a === "deeper"
        ? "Explain this deeper"
        : "";
}

/**
 * The tutor answers in light Markdown: **bold**, "* " bullets and "#" headings.
 * Shown as plain text, the symbols were left in the bubble; this turns them into
 * the formatting they stand for (and nothing else, so no HTML is ever injected).
 */
function renderReply(text: string) {
  return text.split(/\r?\n/).map((raw, i) => {
    if (!raw.trim()) return <span key={i} className="block h-2.5" />;
    const heading = /^\s*#{1,6}\s+/.test(raw);
    const bullet = /^\s*[*-]\s+/.test(raw);
    const line = raw.replace(/^\s*(#{1,6}|[*-])\s+/, "");
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
      part.length > 4 && part.startsWith("**") && part.endsWith("**") ? (
        <strong key={j} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        part
      ),
    );
    return (
      <span
        key={i}
        className={cn("block", heading && "font-semibold", bullet && "relative pl-4 before:absolute before:left-0.5 before:content-['•']")}
      >
        {parts}
      </span>
    );
  });
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-faint"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function LeapChat({
  course,
  video,
  showHeader = true,
}: {
  course: Course;
  video: Video;
  showHeader?: boolean;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [typing, setTyping] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages([
      { id: "welcome", role: "assistant", text: leapWelcome(video), createdAt: new Date().toISOString() },
    ]);
  }, [video.id]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send(text: string, action?: LeapAction) {
    const trimmed = text.trim();
    if (!trimmed && !action) return;
    const userText = action ? labelFor(action) : trimmed;
    const userMsg: ChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      text: userText,
      createdAt: new Date().toISOString(),
    };
    // Conversation history to send (drop the static welcome message).
    const history = [...messages.filter((m) => m.id !== "welcome"), userMsg].map((m) => ({
      role: m.role,
      text: m.text,
    }));
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    const mock = () => leapReply(course, video, trimmed || labelFor(action), action);
    let reply: string;
    try {
      const res = await fetch("/api/leap/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseTitle: course.title,
          video: { title: video.title, summary: video.summary, transcript: video.transcript },
          messages: history,
          action,
        }),
      });
      const data = await res.json();
      // Falls back to the local mock when Gemini isn't configured or errors out.
      reply = data?.reply && !data.fallback ? (data.reply as string) : mock();
    } catch {
      reply = mock();
    }

    setMessages((m) => [
      ...m,
      { id: `a${Date.now()}`, role: "assistant", text: reply, createdAt: new Date().toISOString() },
    ]);
    setTyping(false);
  }

  // Before the first question, the three starters fill the panel instead of leaving it empty.
  const fresh = messages.length <= 1 && !typing;

  return (
    <div className="flex h-full flex-col">
      {showHeader && (
        <div className="flex items-center gap-3 border-b border-hair px-4 py-3.5">
          <LogoMark className="h-9 w-9" />
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold text-heading">LEAP Coach AI</p>
            <p className="inline-flex items-center gap-1.5 text-xs text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Grounded in this lesson
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3.5 overflow-y-auto px-5 py-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-[15px] leading-6",
                m.role === "user" ? "bg-v2-strong text-v2-on-strong" : "bg-surface text-heading",
              )}
            >
              {m.role === "user" ? m.text : renderReply(m.text)}
            </div>
          </div>
        ))}
        {fresh && (
          <div className="space-y-2 pt-1">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                type="button"
                onClick={() => send("", qa.action)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-v2-line-strong px-3.5 py-3 text-left text-sm font-semibold text-heading transition-colors duration-200 hover:border-heading"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-v2-gold-soft text-v2-gold-text">
                  <qa.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">{labelFor(qa.action)}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 ease-out-expo group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
        {typing && (
          <div className="flex">
            <div className="rounded-2xl bg-surface px-4 py-3.5">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      {!fresh && (
        <div className="flex flex-wrap gap-2 px-5 pt-3">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              type="button"
              onClick={() => send("", qa.action)}
              className="inline-flex items-center gap-1.5 rounded-full border border-v2-line-strong bg-card px-3 py-1.5 text-xs font-semibold text-heading transition-colors duration-200 hover:border-heading"
            >
              <qa.icon className="h-3.5 w-3.5" /> {qa.label}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="px-5 pb-5 pt-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-hair bg-surface py-1 pl-5 pr-1 transition-colors duration-200 focus-within:border-heading">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this lesson…"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-heading placeholder:text-muted focus:outline-none"
          />
          <button
            type="submit"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#E9B93E] text-navy-800 transition-colors duration-200 hover:bg-[#F4CB5B] disabled:opacity-40"
            aria-label="Send"
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
