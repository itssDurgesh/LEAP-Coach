"use client";

import * as React from "react";
import { Heart, Trash2, Shield, Send, MessageSquare } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { timeAgo } from "@/lib/utils";

export default function AdminCommunityPage() {
  return (
    <AdminShell title="Community Moderation" subtitle="Monitor the community feed — you can remove any post">
      <Moderation />
    </AdminShell>
  );
}

function Moderation() {
  const { community, postMessage, deleteMessage } = useApp();
  const [text, setText] = React.useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card padded>
        <p className="mb-2 text-sm font-medium text-heading">Post an announcement as Admin</p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Share an update with the whole community…"
          className="min-h-[64px]"
        />
        <div className="mt-2 flex justify-end">
          <Button
            onClick={() => {
              postMessage(text);
              setText("");
            }}
            disabled={!text.trim()}
          >
            <Send className="h-4 w-4" /> Post
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-heading">
          <MessageSquare className="h-5 w-5 text-gold-600" /> {community.length} posts
        </h2>
      </div>

      <div className="space-y-3">
        {community.map((p) => (
          <Card key={p.id} padded>
            <div className="flex items-start gap-3">
              <Avatar name={p.userName} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-heading font-semibold text-heading">{p.userName}</span>
                  {p.userRole === "admin" ? (
                    <Badge variant="navy"><Shield className="h-3 w-3" /> Admin</Badge>
                  ) : (
                    <Badge variant="neutral" className="capitalize">{p.userRole}</Badge>
                  )}
                  <span className="text-xs text-faint">
                    · {timeAgo(p.createdAt)}
                    {p.editedAt ? " · edited" : ""}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-line leading-relaxed text-heading">{p.text}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-faint">
                  <Heart className="h-3.5 w-3.5" /> {p.likedBy.length}
                </div>
              </div>
              <button
                onClick={() => {
                  if (confirm("Remove this post for everyone?")) deleteMessage(p.id);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm text-faint hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
