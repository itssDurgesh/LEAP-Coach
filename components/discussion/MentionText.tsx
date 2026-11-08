import * as React from "react";
import Link from "next/link";

type HandleUser = { id: string; name: string; username?: string };

/**
 * Lower-cased @handle → user, for MentionText. Build it once per user list and pass
 * it to every comment: each comment used to build its own map of every user on
 * every render, which made a long thread slow to type under.
 */
export function handleMap<U extends HandleUser>(users: U[]): Map<string, U> {
  return new Map(users.filter((u) => u.username).map((u) => [u.username!.toLowerCase(), u]));
}

/** Renders text with @username mentions of known users turned into profile links. */
export function MentionText({ text, handles }: { text: string; handles: ReadonlyMap<string, HandleUser> }) {
  if (!text) return null;
  if (!handles.size) return <span className="whitespace-pre-line">{text}</span>;

  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <span className="whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const u = handles.get(part.slice(1).toLowerCase());
          if (u) {
            return (
              <Link key={i} href={`/u/${u.username}`} className="font-medium text-gold-700 hover:underline">
                {part}
              </Link>
            );
          }
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
}
