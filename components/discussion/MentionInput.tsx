"use client";

import * as React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea } from "@/components/ui/Field";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id: string;
  name: string;
  username?: string;
}

/** Resolve @username mentions in free text to user ids. */
export function mentionIdsFromText(text: string, users: MentionUser[]): string[] {
  const tokens = new Set((text.match(/@([a-zA-Z0-9_]+)/g) ?? []).map((t) => t.slice(1).toLowerCase()));
  if (!tokens.size) return [];
  return users.filter((u) => u.username && tokens.has(u.username.toLowerCase())).map((u) => u.id);
}

interface MentionInputProps {
  value: string;
  onChange: (v: string) => void;
  users: MentionUser[];
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  rows?: number;
}

/** A textarea with an @username autocomplete dropdown. */
export function MentionInput({ value, onChange, users, placeholder, autoFocus, className, rows = 3 }: MentionInputProps) {
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [atPos, setAtPos] = React.useState<number | null>(null);
  const [active, setActive] = React.useState(0);
  const pendingCaret = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (pendingCaret.current != null && taRef.current) {
      taRef.current.focus();
      taRef.current.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  });

  const suggestions = React.useMemo(() => {
    if (!open) return [];
    const q = query.toLowerCase();
    return users
      .filter((u) => u.username && (u.username.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [open, query, users]);

  function recompute(text: string, caret: number) {
    const slice = text.slice(0, caret);
    const at = slice.lastIndexOf("@");
    if (at === -1) return setOpen(false);
    const before = at > 0 ? slice[at - 1] : " ";
    if (!/\s/.test(before)) return setOpen(false); // avoid emails etc.
    const q = slice.slice(at + 1);
    if (/[^a-zA-Z0-9_]/.test(q) || q.length > 24) return setOpen(false); // handles are word-chars only
    setQuery(q);
    setAtPos(at);
    setActive(0);
    setOpen(true);
  }

  function pick(u: MentionUser) {
    if (atPos == null || !u.username) return;
    const caret = taRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, atPos);
    const after = value.slice(caret);
    const insert = `@${u.username} `;
    onChange(before + insert + after);
    pendingCaret.current = (before + insert).length;
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <Textarea
        ref={taRef}
        value={value}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          recompute(e.target.value, e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => recompute(value, e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (!open || !suggestions.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 max-h-60 w-72 overflow-y-auto rounded-xl border border-hair bg-card shadow-card-hover">
          {suggestions.map((u, i) => (
            <button
              type="button"
              key={u.id}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(u);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left",
                i === active ? "bg-surface-2" : "hover:bg-surface-2",
              )}
            >
              <Avatar name={u.name} size={26} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-heading">{u.name}</span>
                <span className="block truncate text-xs text-faint">@{u.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
