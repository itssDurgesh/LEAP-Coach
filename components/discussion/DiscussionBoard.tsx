"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, MessageCircle, Pencil, Trash2, Shield, Send, Reply } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MentionInput, mentionIdsFromText, MentionUser } from "@/components/discussion/MentionInput";
import { MentionText } from "@/components/discussion/MentionText";
import { useApp } from "@/lib/store/AppProvider";
import { CommunityPost, PostComment } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

function RoleTag({ role }: { role: CommunityPost["userRole"] }) {
  if (role === "admin")
    return (
      <Badge variant="navy">
        <Shield className="h-3 w-3" /> Admin
      </Badge>
    );
  return (
    <Badge variant="neutral" className="capitalize">
      {role}
    </Badge>
  );
}

const profileHref = (username: string | undefined, fallbackId: string) => `/u/${username ?? fallbackId}`;

function PersonLink({ href, name, size = 40 }: { href: string; name: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 hover:opacity-90">
      <Avatar name={name} size={size} />
    </Link>
  );
}

/** The full LinkedIn-style threaded board. Shared by the learner page and the admin
 *  Discussion Board so the professor posts/replies/tags AND moderates from one place. */
export function DiscussionBoard({ showHeader = true }: { showHeader?: boolean }) {
  const { currentUser, community, postMessage } = useApp();
  const [text, setText] = React.useState("");

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {showHeader && (
        <header>
          <h1 className="font-heading text-3xl font-bold text-heading">Discussion Board</h1>
          <p className="mt-1.5 text-muted">
            Ask questions, share wins, and discuss together. Tag people with{" "}
            <span className="font-semibold text-heading">@</span> to bring them in.
          </p>
        </header>
      )}

      <Card padded>
        <div className="flex gap-3">
          <Avatar src={currentUser!.avatarUrl} name={currentUser!.name} size={40} />
          <div className="flex-1">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Start a discussion…"
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
        {community.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No posts yet — start the conversation.</p>
        )}
        {community.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post }: { post: CommunityPost }) {
  const { currentUser, users, toggleLike, editMessage, deleteMessage, commentsFor, addComment } = useApp();
  const [showComments, setShowComments] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(post.text);

  const comments = commentsFor(post.id);
  const topLevel = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const author = users.find((u) => u.id === post.userId);
  const liked = currentUser ? post.likedBy.includes(currentUser.id) : false;
  const mine = currentUser?.id === post.userId;
  const canDelete = mine || currentUser?.isAdmin;
  const mentionUsers: MentionUser[] = users
    .filter((u) => u.id !== currentUser?.id)
    .map((u) => ({ id: u.id, name: u.name, username: u.username }));

  function submitComment() {
    if (!commentText.trim()) return;
    addComment(post.id, commentText, null, mentionIdsFromText(commentText, mentionUsers));
    setCommentText("");
    setShowComments(true);
  }

  return (
    <Card padded>
      <div className="flex items-start gap-3">
        <PersonLink href={profileHref(author?.username, post.userId)} name={post.userName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={profileHref(author?.username, post.userId)} className="font-heading font-semibold text-heading hover:underline">
              {post.userName}
            </Link>
            <RoleTag role={post.userRole} />
            <span className="text-xs text-faint">
              {author?.username ? `@${author.username} · ` : ""}
              {timeAgo(post.createdAt)}
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
                <Button size="sm" variant="ghost" onClick={() => { setDraft(post.text); setEditing(false); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 whitespace-pre-line leading-relaxed text-heading">{post.text}</p>
          )}

          {/* actions */}
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
            <button
              onClick={() => setShowComments((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm text-faint transition-colors hover:text-heading"
            >
              <MessageCircle className="h-4 w-4" /> {comments.length}
            </button>
            {mine && !editing && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-sm text-faint hover:text-heading">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => { if (confirm("Delete this post?")) deleteMessage(post.id); }}
                className="inline-flex items-center gap-1 text-sm text-faint hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>

          {/* comments */}
          {showComments && (
            <div className="mt-4 space-y-4 border-t border-hair pt-4">
              {topLevel.map((c) => (
                <CommentItem key={c.id} postId={post.id} comment={c} rootId={c.id} replies={repliesOf(c.id)} />
              ))}

              {/* new comment composer */}
              <div className="flex gap-2.5">
                <Avatar src={currentUser!.avatarUrl} name={currentUser!.name} size={32} />
                <div className="flex-1">
                  <MentionInput
                    value={commentText}
                    onChange={setCommentText}
                    users={mentionUsers}
                    placeholder="Add a comment… use @ to tag someone"
                    rows={2}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button size="sm" onClick={submitComment} disabled={!commentText.trim()}>
                      <Send className="h-3.5 w-3.5" /> Comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function CommentItem({
  postId,
  comment,
  rootId,
  replies,
}: {
  postId: string;
  comment: PostComment;
  rootId: string;
  replies?: PostComment[];
}) {
  const { currentUser, users, toggleCommentLike, editComment, deleteComment, addComment } = useApp();
  const [replying, setReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(comment.text);

  const author = users.find((u) => u.id === comment.userId);
  const liked = currentUser ? comment.likedBy.includes(currentUser.id) : false;
  const mine = currentUser?.id === comment.userId;
  const canDelete = mine || currentUser?.isAdmin;
  const mentionUsers: MentionUser[] = users
    .filter((u) => u.id !== currentUser?.id)
    .map((u) => ({ id: u.id, name: u.name, username: u.username }));
  const allUsers = users.map((u) => ({ id: u.id, name: u.name, username: u.username }));

  function startReply() {
    setReplying(true);
    setReplyText(!mine && author?.username ? `@${author.username} ` : "");
  }

  function submitReply() {
    if (!replyText.trim()) return;
    addComment(postId, replyText, rootId, mentionIdsFromText(replyText, mentionUsers));
    setReplyText("");
    setReplying(false);
  }

  return (
    <div className="flex gap-2.5">
      <PersonLink href={profileHref(author?.username, comment.userId)} name={comment.userName} size={32} />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={profileHref(author?.username, comment.userId)} className="text-sm font-semibold text-heading hover:underline">
              {comment.userName}
            </Link>
            <RoleTag role={comment.userRole} />
            <span className="text-xs text-faint">
              {author?.username ? `@${author.username} · ` : ""}
              {timeAgo(comment.createdAt)}
              {comment.editedAt ? " · edited" : ""}
            </span>
          </div>
          {editing ? (
            <div className="mt-1.5">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="min-h-[52px] bg-card" />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => { editComment(comment.id, draft); setEditing(false); }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setDraft(comment.text); setEditing(false); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm leading-relaxed text-heading">
              <MentionText text={comment.text} users={allUsers} />
            </div>
          )}
        </div>

        {/* comment actions */}
        <div className="mt-1.5 flex items-center gap-4 pl-1">
          <button
            onClick={() => toggleCommentLike(comment.id)}
            className={cn("inline-flex items-center gap-1 text-xs transition-colors", liked ? "text-gold-600" : "text-faint hover:text-heading")}
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-gold-500 text-gold-500")} /> {comment.likedBy.length || ""}
          </button>
          <button onClick={startReply} className="inline-flex items-center gap-1 text-xs text-faint hover:text-heading">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
          {mine && !editing && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-faint hover:text-heading">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { if (confirm("Delete this comment?")) deleteComment(comment.id); }}
              className="inline-flex items-center gap-1 text-xs text-faint hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
        </div>

        {/* replies (one level deep) */}
        {replies && replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-hair pl-3">
            {replies.map((r) => (
              <CommentItem key={r.id} postId={postId} comment={r} rootId={rootId} />
            ))}
          </div>
        )}

        {/* reply composer */}
        {replying && (
          <div className="mt-2.5 flex gap-2.5">
            <Avatar src={currentUser!.avatarUrl} name={currentUser!.name} size={28} />
            <div className="flex-1">
              <MentionInput
                value={replyText}
                onChange={setReplyText}
                users={mentionUsers}
                placeholder="Write a reply… use @ to tag"
                rows={2}
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={submitReply} disabled={!replyText.trim()}>
                  <Send className="h-3.5 w-3.5" /> Reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setReplying(false); setReplyText(""); }}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
