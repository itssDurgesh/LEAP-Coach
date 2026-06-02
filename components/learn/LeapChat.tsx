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
    <span className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink-faint"
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

  function send(text: string, action?: LeapAction) {
    const trimmed = text.trim();
    if (!trimmed && !action) return;
    const userText = action ? labelFor(action) : trimmed;
    setMessages((m) => [
      ...m,
      { id: `u${Date.now()}`, role: "user", text: userText, createdAt: new Date().toISOString() },
    ]);
    setInput("");
    setTyping(true);
    window.setTimeout(
      () => {
        const reply = leapReply(course, video, trimmed || labelFor(action), action);
        setMessages((m) => [
          ...m,
          { id: `a${Date.now()}`, role: "assistant", text: reply, createdAt: new Date().toISOString() },
        ]);
        setTyping(false);
      },
      700 + Math.random() * 500,
    );
  }

  return (
    <div className="flex h-full flex-col">
      {showHeader && (
        <div className="flex items-center gap-2.5 border-b border-cream-200 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-navy-900">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="font-heading text-sm font-bold text-navy-800">LEAP Coach AI</p>
            <p className="inline-flex items-center gap-1 text-xs text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Grounded in this lesson
            </p>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[88%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "rounded-br-md bg-navy-800 text-white"
                  : "rounded-bl-md bg-cream-100 text-navy-800",
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-cream-100 px-4 py-3.5">
              <TypingDots />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-cream-200 px-3 pt-3">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => send("", qa.action)}
            className="inline-flex items-center gap-1.5 rounded-full border border-cream-300 bg-white px-2.5 py-1 text-xs font-medium text-navy-700 transition-colors hover:border-gold-300 hover:bg-gold-50"
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
        className="flex items-center gap-2 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this lesson…"
          className="flex-1 rounded-xl border border-cream-300 bg-white px-3.5 py-2.5 text-sm text-navy-800 placeholder:text-ink-faint focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/40"
        />
        <button
          type="submit"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold-500 text-navy-900 transition-colors hover:bg-gold-400"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
