"use client";

import { useState } from "react";
import VoteButtons from "./VoteButtons";
import CommentSection from "./CommentSection";
import { getUserUUID } from "@/lib/uuid";

interface AuthorProfile {
  username: string;
  tag: string;
  color: string;
}

interface SuggestionCardProps {
  id: string;
  uuid_author: string;
  content: string;
  created_at: string;
  score: number;
  userVote: number;
  author?: AuthorProfile;
  label?: string;
  isNew?: boolean;
  onDeleted?: (id: string) => void;
}

const LABEL_CONFIG: Record<string, { bg: string; text: string; display: string }> = {
  idea:       { bg: "#FACC15", text: "#000",   display: "Idea" },
  sugerencia: { bg: "#BAD4F5", text: "#000",   display: "Feedback" },
  no_se:      { bg: "#4B5563", text: "#fff",   display: "No sé" },
};

function extractYouTubeID(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export default function SuggestionCard({
  id,
  uuid_author,
  content,
  created_at,
  score,
  userVote,
  author,
  label,
  isNew,
  onDeleted,
}: SuggestionCardProps) {
  const [deleting, setDeleting] = useState(false);
  const localUuid = getUserUUID();
  const isAuthor = localUuid === uuid_author;

  // Extract YT links for thumbnail preview
  const ytLinks = content.match(/(https?:\/\/(?:www\.)?youtu(?:be\.com\/watch\?v=|\.be\/)[\w-]{11})/g) || [];
  const ytIds = ytLinks.map(extractYouTubeID).filter(Boolean) as string[];

  const [reporting, setReporting] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Seguro que querés borrar tu sugerencia?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suggestions/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid: localUuid })
      });
      if (res.ok && onDeleted) {
        onDeleted(id);
      }
    } catch {
      // fail silently
    } finally {
      setDeleting(false);
    }
  }

  async function handleReport() {
    if (!confirm("¿Reportar esta sugerencia a moderación?")) return;
    setReporting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestion_id: id, uuid_reporter: localUuid })
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
    return <div className="bg-surface border-[3px] border-black p-4 rounded-xl animate-pulse">Borrando...</div>;
  }

  return (
    <article
      className={`bg-surface border-[3px] border-black p-4 rounded-xl flex flex-col gap-4 ${isNew ? "animate-border-fade" : ""}`}
      id={`suggestion-${id}`}
    >
      <div className="flex gap-4 flex-col sm:flex-row items-start">
        <div className="shrink-0 w-full sm:w-auto flex flex-col items-center gap-2">
          <VoteButtons
            suggestionId={id}
            initialScore={score}
            initialUserVote={userVote}
          />
          {/* Label pill - fixed width so all are equal size */}
          {(() => {
            const cfg = LABEL_CONFIG[label || "sugerencia"] || LABEL_CONFIG["sugerencia"];
            return (
              <div
                className="w-16 text-center text-[10px] font-black uppercase px-1 py-1 border-[2px] border-black rounded-full overflow-hidden whitespace-nowrap text-ellipsis"
                style={{ backgroundColor: cfg.bg, color: cfg.text }}
                title={cfg.display}
              >
                {cfg.display}
              </div>
            );
          })()}
        </div>

        <div className="flex-1 min-w-0 w-full">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-sans font-bold">
              {author ? (
                <span style={{ color: author.color }}>
                  {author.username}
                  <span className="opacity-70">#{author.tag}</span>
                </span>
              ) : (
                <span className="text-muted">Anónimo</span>
              )}
            </div>
            
            {isAuthor ? (
              <button 
                onClick={handleDelete}
                className="text-muted hover:text-red-500 transition-colors p-1"
                title="Eliminar mi sugerencia"
                aria-label="Eliminar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            ) : (
              <button onClick={handleReport} disabled={reporting} className="text-muted hover:text-red-500 hover:underline text-xs font-sans font-bold">
                {reporting ? "..." : "Reportar"}
              </button>
            )}
          </div>

          <p className="text-foreground break-words leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
          
          {ytIds.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {ytIds.map((vid, idx) => (
                <a key={idx} href={`https://youtube.com/watch?v=${vid}`} target="_blank" rel="noreferrer" className="block border-[3px] border-black rounded-lg overflow-hidden w-48 relative hover:opacity-80">
                  <img src={`https://img.youtube.com/vi/${vid}/0.jpg`} alt="YouTube preview" className="w-full h-auto" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="bg-red-600 text-white font-black px-2 py-1 rounded border-[3px] border-black text-xs">▶</div>
                  </div>
                </a>
              ))}
            </div>
          )}
          
          <div className="flex justify-end mt-2">
            <p className="text-xs text-muted font-sans font-bold">
              {new Date(created_at).toLocaleDateString("es", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="w-full mt-2 border-t-[3px] border-black/20 pt-2">
        <CommentSection suggestionId={id} />
      </div>
    </article>
  );
}
