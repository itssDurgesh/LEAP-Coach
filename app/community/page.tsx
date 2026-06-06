"use client";

import * as React from "react";
import { Heart, Pencil, Trash2, Shield, Send } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { useApp } from "@/lib/store/AppProvider";
import { CommunityPost } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export default function CommunityPage() {
  return (
    <AppShell>
      <Community />
    </AppShell>
  );
}

function Community() {
  const { currentUser, community, postMessage } = useApp();
  const [text, setText] = React.useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <h1 className="font-heading text-3xl font-bold text-heading">Community</h1>
        <p className="mt-1.5 text-muted">Share wins, ask questions, and grow together.</p>
      </header>

      <Card padded>
        <div className="flex gap-3">
          <Avatar name={currentUser!.name} size={40} />
          <div className="flex-1">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share something with the community…"
              className="min-h-[72px]"
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
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {community.map((p) => (
          <PostItem key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function PostItem({ post }: { post: CommunityPost }) {
  const { currentUser, toggleLike, editMessage, deleteMessage } = useApp();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(post.text);

  const liked = currentUser ? post.likedBy.includes(currentUser.id) : false;
  const mine = currentUser?.id === post.userId;
  const canDelete = mine || currentUser?.isAdmin;

  return (
    <Card padded>
      <div className="flex items-start gap-3">
        <Avatar name={post.userName} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading font-semibold text-heading">{post.userName}</span>
            {post.userRole === "admin" ? (
              <Badge variant="navy">
                <Shield className="h-3 w-3" /> Admin
              </Badge>
            ) : (
              <Badge variant="neutral" className="capitalize">{post.userRole}</Badge>
            )}
            <span className="text-xs text-faint">
              · {timeAgo(post.createdAt)}
              {post.editedAt ? " · edited" : ""}
            </span>
          </div>

          {editing ? (
            <div className="mt-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[64px]" />
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    editMessage(post.id, draft);
                    setEditing(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(post.text);
                    setEditing(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 whitespace-pre-line leading-relaxed text-heading">{post.text}</p>
          )}

          <div className="mt-3 flex items-center gap-4">
            <button
              onClick={() => toggleLike(post.id)}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm transition-colors",
                liked ? "text-gold-600" : "text-faint hover:text-heading",
              )}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-gold-500 text-gold-500")} /> {post.likedBy.length}
            </button>
            {mine && !editing && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-sm text-faint hover:text-heading">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => {
                  if (confirm("Delete this post?")) deleteMessage(post.id);
                }}
                className="inline-flex items-center gap-1 text-sm text-faint hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
