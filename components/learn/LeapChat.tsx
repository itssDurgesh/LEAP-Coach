"use client";

import * as React from "react";
import { ArrowRight, Send, FileText, HelpCircle, Layers } from "lucide-react";
import { LogoMark } from "@/components/ui/Logo";
import { Course, Video, ChatMessage } from "@/lib/types";
import { leapReply, leapWelcome, LeapAction } from "@/lib/mock/leapAI";
import { loadTranscript } from "@/lib/transcripts";
import { MAX_TRANSCRIPT_CHARS } from "@/lib/ai/limits";
import { isClerkConfigured } from "@/lib/clerk/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

// With the real services on, the tutor route reads the session's transcript from the
// database by id. Only the local demo (topics in this browser only) sends its own.
const live = isClerkConfigured && isSupabaseConfigured;

const UNAVAILABLE = "I couldn't answer that just now. Please try again in a moment.";

/** One event of the tutor's streamed reply (see app/api/leap/chat). */
interface ReplyEvent {
  delta?: string;
  done?: boolean;
  error?: boolean;
}

/** Read a text/event-stream body, calling `onText` with the reply so far. Returns the whole reply ("" if none). */
async function readReply(body: ReadableStream<Uint8Array>, onText: (text: string) => void): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      let event: ReplyEvent;
      try {
        event = JSON.parse(line.slice(5).trim()) as ReplyEvent;
      } catch {
        continue;
      }
      if (event.error) return text;
      if (typeof event.delta === "string" && event.delta) {
        text += event.delta;
        onText(text);
      }
    }
  }
  return text;
}

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

/** `**bold**`, `*italic*` and `` `code` `` inside one line; any marker left unpaired is dropped. */
function renderInline(line: string) {
  return line.split(/(\*{2,3}[^*]+\*{2,3}|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`)/g).map((part, j) => {
    const bold = /^(\*{2,3}|__)(.+?)(\*{2,3}|__)$/.exec(part);
    if (bold)
      return (
        <strong key={j} className="font-semibold">
          {bold[2]}
        </strong>
      );
    if (/^\*[^*]+\*$/.test(part)) return <em key={j}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return part.slice(1, -1);
    return part.replace(/\*{2,}|`/g, "");
  });
}

/**
 * The tutor is told to answer in plain text, but models still slip into Markdown
 * (**bold**, "* " bullets, indented sub-bullets, "#" headings, "1." steps, ">" quotes).
 * Shown as-is, those symbols were left in the bubble; this turns them into the
 * formatting they stand for (and nothing else, so no HTML is ever injected).
 */
function renderReply(text: string) {
  return text.split(/\r?\n/).map((raw, i) => {
    const line = raw.replace(/^\s*>\s?/, "");
    // Blank lines and "---" / "***" rules are just a gap between paragraphs.
    if (!line.trim() || /^\s*([-*_])\1{2,}\s*$/.test(line)) return <span key={i} className="block h-2.5" />;

    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (heading)
      return (
        <span key={i} className="block font-semibold">
          {renderInline(heading[1].replace(/\s+#+\s*$/, ""))}
        </span>
      );

    const item = /^(\s*)([*+•-]|\d{1,2}[.)])\s+(.*)$/.exec(line);
    if (item) {
      const nested = item[1].replace(/\t/g, "  ").length >= 2;
      const marker = /\d/.test(item[2]) ? item[2].replace(")", ".") : "•";
      return (
        <span key={i} className={cn("flex gap-2", nested && "pl-4")}>
          <span className="shrink-0 tabular-nums">{marker}</span>
          <span className="min-w-0">{renderInline(item[3])}</span>
        </span>
      );
    }

    return (
      <span key={i} className="block">
        {renderInline(line.trimStart())}
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

// Memoized: it sits on the lesson page, which re-renders for reasons that never
// concern the chat (store updates, switching the lesson tabs).
export const LeapChat = React.memo(function LeapChat({
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
  // Replies still coming in for this session; stopped when the learner moves on.
  const inFlight = React.useRef(new Set<AbortController>());

  React.useEffect(() => {
    setMessages([
      { id: "welcome", role: "assistant", text: leapWelcome(video), createdAt: new Date().toISOString() },
    ]);
    setTyping(false);
    const pending = inFlight.current;
    return () => {
      // Another session (or another page): a reply still streaming belongs to the
      // old conversation, so stop it rather than let it land in the new one.
      pending.forEach((c) => c.abort());
      pending.clear();
    };
  }, [video.id]);

  // The learner's own message (and the typing dots) scroll smoothly into view. A reply
  // streaming in keeps its end in view instantly, since a smooth scroll per piece
  // stutters, and only while the learner is at the end: someone who scrolled up to
  // re-read is left where they are. "At the end" is measured against the height
  // before this update, so a tall piece of text cannot make it look otherwise.
  const lastHeight = React.useRef(0);
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atEnd = lastHeight.current - el.scrollTop - el.clientHeight < 48;
    if (typing || messages[messages.length - 1]?.role === "user") el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    else if (atEnd) el.scrollTop = el.scrollHeight;
    lastHeight.current = el.scrollHeight;
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

    const ctl = new AbortController();
    inFlight.current.add(ctl);
    const replyId = `a${Date.now()}`;
    // The reply's bubble appears with its first piece and then grows.
    const show = (text: string) =>
      setMessages((m) =>
        m.some((x) => x.id === replyId)
          ? m.map((x) => (x.id === replyId ? { ...x, text } : x))
          : [...m, { id: replyId, role: "assistant", text, createdAt: new Date().toISOString() }],
      );

    try {
      // Real services: the route reads the transcript itself, so none is sent (or
      // fetched here). The local demo sends this browser's copy. The transcript went
      // up whole with every message once, and one over the size limit failed them all.
      const context = live ? "" : (await loadTranscript(video)).trim().slice(0, MAX_TRANSCRIPT_CHARS);
      const res = await fetch("/api/leap/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          videoId: video.id,
          ...(live ? {} : { courseTitle: course.title, video: { title: video.title, transcript: context } }),
          messages: history,
          action,
        }),
      });

      if (res.ok && res.body && (res.headers.get("content-type") ?? "").includes("text/event-stream")) {
        const text = await readReply(res.body, (soFar) => {
          setTyping(false);
          show(soFar);
        });
        // Nothing came through (blocked, or the connection dropped at once).
        if (!text) show(UNAVAILABLE);
      } else {
        const data = await res.json().catch(() => null);
        if (data?.fallback) {
          // No AI key on this setup: the canned local replies, which read the transcript.
          const transcript = await loadTranscript(video).catch(() => "");
          show(leapReply(course, { ...video, transcript }, trimmed || labelFor(action), action));
        } else {
          // An answer the route wrote itself (no transcript yet, session gone), or a
          // failure. The mock is not used here: it is not written from the transcript.
          show(typeof data?.reply === "string" && data.reply ? data.reply : UNAVAILABLE);
        }
      }
    } catch {
      // Stopped on purpose (the learner moved on) → leave the old conversation alone.
      if (!ctl.signal.aborted) show(UNAVAILABLE);
    } finally {
      inFlight.current.delete(ctl);
      if (!ctl.signal.aborted) setTyping(false);
    }
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
});
