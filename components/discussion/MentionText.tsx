import * as React from "react";
import Link from "next/link";

/** Renders text with @username mentions of known users turned into profile links. */
export function MentionText({
  text,
  users,
}: {
  text: string;
  users: { id: string; name: string; username?: string }[];
}) {
  if (!text) return null;
  const byHandle = new Map(users.filter((u) => u.username).map((u) => [u.username!.toLowerCase(), u]));
  if (!byHandle.size) return <span className="whitespace-pre-line">{text}</span>;

  const parts = text.split(/(@[a-zA-Z0-9_]+)/g);
  return (
    <span className="whitespace-pre-line">
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const u = byHandle.get(part.slice(1).toLowerCase());
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
