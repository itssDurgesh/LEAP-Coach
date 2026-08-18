"use client";

import * as React from "react";
import { Send, Bot, FileText, HelpCircle, Layers } from "lucide-react";
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

  return (
    <div className="flex h-full flex-col">
      {showHeader && (
        <div className="flex items-center gap-3 border-b border-hair px-4 py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-500 text-navy-900">
            <Bot className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold text-heading">LEAP Coach AI</p>
            <p className="inline-flex items-center gap-1.5 text-xs text-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Grounded in this lesson
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "assistant" && (
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-600 ring-1 ring-gold-500/25">
                <Bot className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md bg-navy-800 text-white dark:bg-surface-2 dark:text-heading"
                  : "rounded-bl-md border border-hair bg-surface text-heading",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gold-500/15 text-gold-600 ring-1 ring-gold-500/25">
              <Bot className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-2xl rounded-bl-md border border-hair bg-surface px-4 py-3.5">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-hair px-3 pt-3">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => send("", qa.action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-card px-3 py-1.5 text-xs font-semibold text-heading transition-all duration-200 hover:border-gold-500 hover:bg-gold-500 hover:text-navy-900"
          >
            <qa.icon className="h-3.5 w-3.5" /> {qa.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="p-3"
      >
        <div className="flex items-center gap-2 rounded-full border border-hair bg-card py-1 pl-4 pr-1 transition-colors duration-200 focus-within:border-gold-400 focus-within:ring-2 focus-within:ring-gold-400/30">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this lesson…"
            className="min-w-0 flex-1 bg-transparent py-2 text-sm text-heading placeholder:text-faint focus:outline-none"
          />
          <button
            type="submit"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-500 text-navy-900 transition-all duration-200 hover:bg-gold-400 disabled:opacity-40"
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
