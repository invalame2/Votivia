"use client";

import { useState, useEffect } from "react";
import { getUserUUID } from "@/lib/uuid";
import { checkCooldown, setCooldown, validateContent, checkDuplicate, markAsPosted, MAX_CONTENT_LENGTH } from "@/lib/antispam";

interface AuthorProfile {
  username: string;
  tag: string;
  color: string;
}

export interface CommentType {
  id: string;
  uuid_author: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles?: AuthorProfile;
}

function CommentItem({ 
  comment, 
  allComments, 
  suggestionId, 
  onCommentAdded,
  onCommentDeleted,
  isAdmin
}: { 
  comment: CommentType; 
  allComments: CommentType[]; 
  suggestionId: string;
  onCommentAdded: (c: CommentType) => void;
  onCommentDeleted: (id: string) => void;
  isAdmin?: boolean;
}) {
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const localUuid = getUserUUID();
  const isAuthor = localUuid === comment.uuid_author;
  const children = allComments.filter(c => c.parent_id === comment.id);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || submitting) return;

    const validation = validateContent(replyText);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    if (!checkCooldown("comment").ok) {
      alert("Espera unos segundos antes de publicar de nuevo.");
      return;
    }
    if (checkDuplicate(replyText)) {
      alert("Ya publicaste esto antes.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          parent_id: comment.id,
          uuid_author: localUuid,
          content: replyText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCooldown("comment");
        markAsPosted(replyText);
        onCommentAdded(data.comment);
        setReplyText("");
        setReplying(false);
      } else {
        const d = await res.json();
        alert(d.error || "Error");
      }
    } catch {
      // fail silently
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Borrar este comentario?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: localUuid })
      });
      if (res.ok) {
        onCommentDeleted(comment.id);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleReport() {
    if (!confirm("¿Reportar este comentario a moderación?")) return;
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: comment.id, uuid_reporter: localUuid })
      });
      if (res.ok) {
        alert("Reportado con éxito.");
      } else {
        const d = await res.json();
        alert(d.error || "Ya reportaste esto.");
      }
    } finally {
      setReporting(false);
    }
  }

  if (deleting) {
    return <div className="border-l-[3px] border-black pl-3 py-1 mt-2 text-sm text-muted animate-pulse font-sans font-bold">Borrando...</div>;
  }

  return (
    <div id={`comment-${comment.id}`} className="border-l-[3px] border-black pl-3 py-1 mt-2 transition-colors duration-500">
      <div className="flex justify-between items-start">
        <div className="text-xs font-sans font-bold mb-1">
          {comment.profiles ? (
            <span style={{ color: comment.profiles.color }}>
              {comment.profiles.username}<span className="opacity-70">#{comment.profiles.tag}</span>
            </span>
          ) : (
            <span className="text-muted">Anónimo</span>
          )}
        </div>
        <div className="flex gap-2 text-xs font-sans font-bold items-center">
          {isAuthor || isAdmin ? (
             <button onClick={handleDelete} className="text-muted hover:text-red-500 transition-colors" aria-label="Eliminar" title="Eliminar">
               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                 <polyline points="3 6 5 6 21 6"></polyline>
                 <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
               </svg>
             </button>
          ) : (
             <button onClick={handleReport} disabled={reporting} className="text-muted hover:text-red-500 hover:underline">
               {reporting ? "..." : "Reportar"}
             </button>
          )}
        </div>
      </div>
      
      <p className="text-sm text-foreground break-words">{comment.content}</p>
      
      <div className="flex gap-4 items-center mt-1">
        <p className="text-[10px] text-muted font-sans font-bold" title={new Date(comment.created_at).toLocaleString("es")}>
          {new Date(comment.created_at).toLocaleDateString("es", {
            day: "numeric",
            month: "numeric",
            year: "2-digit"
          })}
        </p>
        <button 
          onClick={() => setReplying(!replying)} 
          className="text-[10px] uppercase font-black text-foreground hover:underline"
        >
          Responder
        </button>
      </div>

      {replying && (
        <form onSubmit={handleReply} className="mt-2 flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Respuesta..."
            maxLength={MAX_CONTENT_LENGTH}
            className="flex-1 bg-background border-[3px] border-black px-2 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none font-sans font-bold"
          />
          <button
            type="submit"
            disabled={submitting || !replyText.trim()}
            className="bg-surface rounded-md border-[3px] border-black px-2 py-1 text-xs font-black text-foreground hover:bg-foreground hover:text-background disabled:opacity-40"
          >
            →
          </button>
        </form>
      )}

      {children.map(child => (
        <CommentItem 
          key={child.id} 
          comment={child} 
          allComments={allComments} 
          suggestionId={suggestionId} 
          onCommentAdded={onCommentAdded} 
          onCommentDeleted={onCommentDeleted}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
}

interface Props {
  suggestionId: string;
  isAdmin?: boolean;
}

export default function CommentSection({ suggestionId, isAdmin }: Props) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const localUuid = getUserUUID();

  // Fetch the count immediately on mount
  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch(`/api/comments?suggestion_id=${suggestionId}&count_only=true`);
        if (res.ok) {
          const data = await res.json();
          setCommentCount(data.count ?? 0);
        }
      } catch {
        // Silently fail
      }
    }
    fetchCount();
  }, [suggestionId]);

  useEffect(() => {
    if (!expanded) return;

    async function fetchComments() {
      setLoading(true);
      try {
        const res = await fetch(`/api/comments?suggestion_id=${suggestionId}`);
        if (res.ok) {
          const data = await res.json();
          setComments(data.comments || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchComments();
  }, [expanded, suggestionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || submitting) return;

    const validation = validateContent(newComment);
    if (!validation.ok) {
      alert(validation.error);
      return;
    }
    if (!checkCooldown("comment").ok) {
      alert("Espera unos segundos antes de publicar de nuevo.");
      return;
    }
    if (checkDuplicate(newComment)) {
      alert("Ya publicaste esto antes.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          parent_id: null,
          uuid_author: localUuid,
          content: newComment.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCooldown("comment");
        markAsPosted(newComment);
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      } else {
        const d = await res.json();
        alert(d.error || "Error");
      }
    } catch {
      // Silently fail
    } finally {
      setSubmitting(false);
    }
  }

  // Filter root level comments (no parent_id)
  const rootComments = comments.filter(c => !c.parent_id);

  return (
    <div className="mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-muted hover:text-foreground font-sans font-bold"
        id={`toggle-comments-${suggestionId}`}
      >
        {expanded ? "— Ocultar respuestas" : `+ Respuestas (${commentCount !== null ? commentCount : comments.length})`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted font-sans font-bold">Cargando...</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted font-sans font-bold">Sé el primero en comentar.</p>
          ) : (
            rootComments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                allComments={comments} 
                suggestionId={suggestionId}
                onCommentAdded={(c) => setComments(p => [...p, c])}
                onCommentDeleted={(id) => setComments(p => p.filter(x => x.id !== id))}
                isAdmin={isAdmin}
              />
            ))
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 mt-4 pt-2 border-t-[3px] border-black/20">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Comentar..."
              maxLength={MAX_CONTENT_LENGTH}
              className="flex-1 bg-background border-[3px] border-black px-2 py-1 text-sm text-foreground placeholder:text-muted focus:outline-none font-sans font-bold"
              id={`comment-input-${suggestionId}`}
            />
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-surface rounded-xl border-[3px] border-black px-3 py-1 text-sm font-black text-foreground hover:bg-foreground hover:text-background disabled:opacity-40"
              id={`comment-submit-${suggestionId}`}
            >
              Comentar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
