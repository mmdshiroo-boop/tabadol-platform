"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import apiClient from "@/services/api/client";
import { useAuth } from "@/app/context/AuthContext";
import { MessageSquare, Reply, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import VerifiedBadge from "@/components/common/VerifiedBadge";

interface CommentUser {
  _id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isVerified?: boolean;
}

interface Comment {
  _id: string;
  ad: string;
  user: CommentUser;
  content: string;
  parent?: string;
  createdAt: string;
}

export function CommentsSection({ adId }: { adId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const res = await apiClient.get(`/comments/ad/${adId}`);
      setComments(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [adId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;
    setLoading(true);
    try {
      await apiClient.post("/comments", {
        adId,
        content,
        parentId: parentId || null,
      });
      toast.success("نظر شما ثبت شد");
      if (parentId) {
        setReplyContent("");
        setReplyTo(null);
      } else {
        setNewComment("");
      }
      fetchComments();
    } catch (err) {
      toast.error("خطا در ثبت نظر");
    } finally {
      setLoading(false);
    }
  };

  const buildCommentTree = (flatComments: Comment[]) => {
    const map = new Map<string, Comment & { replies: Comment[] }>();
    const roots: (Comment & { replies: Comment[] })[] = [];

    flatComments.forEach((c) => {
      map.set(c._id, { ...c, replies: [] });
    });

    flatComments.forEach((c) => {
      const node = map.get(c._id)!;
      if (c.parent && map.has(c.parent)) {
        map.get(c.parent)!.replies.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const commentTree = buildCommentTree(comments);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">نظرات</h3>
        <span className="text-sm text-muted-foreground">
          ({comments.length})
        </span>
      </div>

      {user && (
        <div className="space-y-3 bg-muted/20 p-4 rounded-xl border">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="نظر خود را بنویسید..."
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => handleSubmit()}
              disabled={loading || !newComment.trim()}
            >
              {loading ? "در حال ارسال..." : "ارسال نظر"}
            </Button>
          </div>
        </div>
      )}

      {commentTree.length === 0 && !user && (
        <p className="text-muted-foreground text-center py-4">
          هنوز نظری ثبت نشده است. برای ثبت نظر وارد شوید.
        </p>
      )}
      {commentTree.length === 0 && user && (
        <p className="text-muted-foreground text-center py-4">
          اولین نظر را شما بنویسید!
        </p>
      )}

      <div className="space-y-4">
        {commentTree.map((root) => (
          <CommentItem
            key={root._id}
            comment={root}
            onReply={(id) => {
              setReplyTo(id);
              setReplyContent("");
            }}
            replyTo={replyTo}
            replyContent={replyContent}
            setReplyContent={setReplyContent}
            onSubmitReply={handleSubmit}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
  replyTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  loading,
}: {
  comment: any;
  onReply: (id: string) => void;
  replyTo: string | null;
  replyContent: string;
  setReplyContent: (val: string) => void;
  onSubmitReply: (parentId?: string) => void;
  loading: boolean;
}) {
  const [showReplies, setShowReplies] = useState(true);

  return (
    <div className="space-y-3">
      <div className="p-4 border rounded-xl bg-card">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
            {comment.user.firstName?.[0] || "U"}
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/profile/${comment.user._id}`}
                  className="font-semibold text-sm hover:underline underline-offset-4"
                >
                  {comment.user.firstName} {comment.user.lastName}
                </Link>
                {comment.user.isVerified && <VerifiedBadge size="sm" />}
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </div>
            <p className="text-sm mt-2 text-foreground/80">{comment.content}</p>
            <button
              onClick={() => onReply(comment._id)}
              className="text-xs text-primary mt-2 flex items-center gap-1 hover:underline"
            >
              <Reply className="w-3 h-3" /> پاسخ
            </button>
          </div>
        </div>

        {replyTo === comment._id && (
          <div className="mt-3 mr-10 bg-muted/30 p-3 rounded-lg border">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="پاسخ خود را بنویسید..."
              rows={2}
              className="text-sm"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReply(null as any)}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                onClick={() => onSubmitReply(comment._id)}
                disabled={loading || !replyContent.trim()}
              >
                ارسال پاسخ
              </Button>
            </div>
          </div>
        )}
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mr-6 border-r-2 border-muted-foreground/20 pr-4 space-y-3">
          <button
            onClick={() => setShowReplies(!showReplies)}
            className="text-xs text-muted-foreground flex items-center gap-1 mb-2"
          >
            {showReplies ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {showReplies
              ? "پنهان کردن پاسخ‌ها"
              : `نمایش ${comment.replies.length} پاسخ`}
          </button>
          {showReplies &&
            comment.replies.map((reply: any) => (
              <CommentItem
                key={reply._id}
                comment={reply}
                onReply={onReply}
                replyTo={replyTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                onSubmitReply={onSubmitReply}
                loading={loading}
              />
            ))}
        </div>
      )}
    </div>
  );
}