"use client";

import { useState } from "react";
import { addComment } from "@/lib/actions/comments";
import type { Comment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

interface CommentThreadProps {
  taskId: string;
  initialComments: Comment[];
  currentUserId: string;
}

export function CommentThread({
  taskId,
  initialComments,
  currentUserId,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addComment({ taskId, content });
      setComments((prev) => [...prev, comment]);
      setContent("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 focus-dim-active">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-text-secondary" />
        <h3 className="text-lg font-semibold tracking-tight text-text-primary">
          Comments ({comments.length})
        </h3>
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="bg-surface-1/50 border border-border-subtle rounded-xl p-6 text-center">
            <p className="text-sm text-text-tertiary">No comments yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => {
              const isMe = c.userId === currentUserId;
              return (
                <div
                  key={c.commentId}
                  className={`rounded-xl p-4 border ${
                    isMe
                      ? "bg-brand/5 border-brand/20 ml-6"
                      : "bg-surface-1 border-border-default mr-6"
                  }`}
                  style={{ boxShadow: "var(--shadow-xs)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text-primary">
                      {isMe ? "You" : c.userFullName || c.userId}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {new Date(c.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {c.content}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 focus-dim pt-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment... (Type / for commands)"
          className="bg-surface-1 border-border-default focus:border-brand/50 resize-none min-h-[100px] text-sm text-text-primary placeholder:text-text-tertiary"
          style={{ transitionDuration: "var(--transition-fast)" }}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="bg-brand hover:bg-brand-hover text-white transition-colors h-9 px-4"
          >
            {submitting ? "Posting..." : "Post Comment"}
            {!submitting && <Send className="w-3 h-3 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
