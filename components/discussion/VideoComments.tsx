"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, Pencil, Trash2, Shield, Send, Reply, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { MentionInput, mentionIdsFromText, MentionUser } from "@/components/discussion/MentionInput";
import { MentionText } from "@/components/discussion/MentionText";
import { useApp } from "@/lib/store/AppProvider";
import { Course, VideoComment, Video } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const profileHref = (username: string | undefined, fallbackId: string) => `/u/${username ?? fallbackId}`;

function RoleTag({ role }: { role: VideoComment["userRole"] }) {
  if (role === "admin")
    return (
      <Badge variant="navy">
        <Shield className="h-3 w-3" /> Mentor
      </Badge>
    );
  return (
    <Badge variant="neutral" className="capitalize">
      {role}
    </Badge>
  );
}

/** YouTube-style comments under a single topic video: threaded one reply level,
 *  @mentions (which notify the tagged person), likes, edit/delete (own + admin). */
export function VideoComments({ course, video, hideHeader }: { course: Course; video: Video; hideHeader?: boolean }) {
  const { currentUser, users, videoCommentsFor, addVideoComment } = useApp();
  const [text, setText] = React.useState("");

  const comments = videoCommentsFor(video.id);
  const topLevel = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const mentionUsers: MentionUser[] = users
    .filter((u) => u.id !== currentUser?.id && !u.banned)
    .map((u) => ({ id: u.id, name: u.name, username: u.username }));

  function submit() {
    if (!text.trim()) return;
    addVideoComment(video.id, course.id, text, null, mentionIdsFromText(text, mentionUsers));
    setText("");
  }

  return (
    <div>
      {!hideHeader && (
        <div className="mb-4 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-gold-600" />
          <h3 className="font-heading text-lg font-bold text-heading">
            Discussion {comments.length > 0 && <span className="text-faint">· {comments.length}</span>}
          </h3>
        </div>
      )}

      {/* composer */}
      {currentUser && (
        <div className="flex gap-2.5">
          <Avatar src={currentUser.avatarUrl} name={currentUser.name} size={36} />
          <div className="flex-1">
            <MentionInput
              value={text}
              onChange={setText}
              users={mentionUsers}
              placeholder="Ask a question or share a takeaway… use @ to tag someone"
              rows={2}
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={submit} disabled={!text.trim()}>
                <Send className="h-3.5 w-3.5" /> Comment
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* thread */}
      <div className="mt-5 space-y-5">
        {topLevel.length === 0 && (
          <p className="py-6 text-center text-sm text-faint">
            No comments yet — be the first to start the discussion on this video.
          </p>
        )}
        {topLevel.map((c) => (
          <CommentItem
            key={c.id}
            course={course}
            video={video}
            comment={c}
            rootId={c.id}
            replies={repliesOf(c.id)}
            mentionUsers={mentionUsers}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  course,
  video,
  comment,
  rootId,
  replies,
  mentionUsers,
}: {
  course: Course;
  video: Video;
  comment: VideoComment;
  rootId: string;
  replies?: VideoComment[];
  mentionUsers: MentionUser[];
}) {
  const { currentUser, users, toggleVideoCommentLike, editVideoComment, deleteVideoComment, addVideoComment } = useApp();
  const [replying, setReplying] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(comment.text);

  const author = users.find((u) => u.id === comment.userId);
  const liked = currentUser ? comment.likedBy.includes(currentUser.id) : false;
  const mine = currentUser?.id === comment.userId;
  const canEdit = mine || !!currentUser?.isAdmin; // admins moderate any comment
  const canDelete = mine || !!currentUser?.isAdmin;
  const allUsers = users.map((u) => ({ id: u.id, name: u.name, username: u.username }));

  function startReply() {
    setReplying(true);
    setReplyText(!mine && author?.username ? `@${author.username} ` : "");
  }

  function submitReply() {
    if (!replyText.trim()) return;
    addVideoComment(video.id, course.id, replyText, rootId, mentionIdsFromText(replyText, mentionUsers));
    setReplyText("");
    setReplying(false);
  }

  return (
    <div className="flex gap-2.5">
      <Link href={profileHref(author?.username, comment.userId)} className="shrink-0 hover:opacity-90">
        <Avatar src={author?.avatarUrl} name={comment.userName} size={36} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-surface-2 px-3.5 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={profileHref(author?.username, comment.userId)}
              className="text-sm font-semibold text-heading hover:underline"
            >
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
                <Button size="sm" onClick={() => { editVideoComment(comment.id, draft); setEditing(false); }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setDraft(comment.text); setEditing(false); }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="mt-1 text-sm leading-relaxed text-heading">
              <MentionText text={comment.text} users={allUsers} />
            </div>
          )}
        </div>

        {/* actions */}
        <div className="mt-1.5 flex items-center gap-4 pl-1">
          <button
            onClick={() => toggleVideoCommentLike(comment.id)}
            className={cn("inline-flex items-center gap-1 text-xs transition-colors", liked ? "text-gold-600" : "text-faint hover:text-heading")}
          >
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-gold-500 text-gold-500")} /> {comment.likedBy.length || ""}
          </button>
          <button onClick={startReply} className="inline-flex items-center gap-1 text-xs text-faint hover:text-heading">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
          {canEdit && !editing && (
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-xs text-faint hover:text-heading">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { if (confirm("Delete this comment?")) deleteVideoComment(comment.id); }}
              className="inline-flex items-center gap-1 text-xs text-faint hover:text-red-600"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          )}
          {!mine && currentUser?.isAdmin && (
            <span className="inline-flex items-center gap-1 text-xs text-faint">
              <Shield className="h-3 w-3" /> moderating
            </span>
          )}
        </div>

        {/* replies (one level deep) */}
        {replies && replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l-2 border-hair pl-3">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                course={course}
                video={video}
                comment={r}
                rootId={rootId}
                mentionUsers={mentionUsers}
              />
            ))}
          </div>
        )}

        {/* reply composer */}
        {replying && (
          <div className="mt-2.5 flex gap-2.5">
            <Avatar src={currentUser?.avatarUrl} name={currentUser?.name ?? ""} size={28} />
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
