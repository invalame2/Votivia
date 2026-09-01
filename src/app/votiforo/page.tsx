"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import SuggestionCard from "@/components/SuggestionCard";
import NotificationBell from "@/components/NotificationBell";
import { getUserUUID } from "@/lib/uuid";
import {
  checkCooldown,
  setCooldown,
  validateContent,
  checkDuplicate,
  markAsPosted,
  MAX_CONTENT_LENGTH,
} from "@/lib/antispam";
import { ensureProfile } from "@/lib/profile";

interface AuthorProfile {
  username: string;
  tag: string;
  color: string;
}

interface Suggestion {
  id: string;
  uuid_author: string;
  content: string;
  created_at: string;
  score: number;
  userVote: number;
  label?: string;
  author?: AuthorProfile;
  isNew?: boolean;
}

const LABELS = [
  { value: "idea",       display: "Idea",     bg: "#FACC15", text: "#000" },
  { value: "sugerencia", display: "Feedback",  bg: "#BAD4F5", text: "#000" },
  { value: "no_se",      display: "No sé",    bg: "#4B5563", text: "#fff" },
];

const LABEL_FILTER_OPTIONS = [{ value: "", display: "Todos" }, ...LABELS];

export default function SugerenciasPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newContent, setNewContent] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sort, setSort] = useState("recomendados");
  const [labelFilter, setLabelFilter] = useState("");
  const [mineFilter, setMineFilter] = useState(false);
  
  const loaderRef = useRef<HTMLDivElement>(null);
  const mainFormRef = useRef<HTMLFormElement>(null);
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  useEffect(() => {
    ensureProfile();
  }, []);

  const fetchSuggestions = useCallback(async (pageNum: number, currentSort: string, currentLabel?: string, currentMine?: boolean) => {
    const uuid = getUserUUID();
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const lbl = currentLabel !== undefined ? currentLabel : labelFilter;
      const isMine = currentMine !== undefined ? currentMine : mineFilter;
      const labelParam = lbl ? `&label=${lbl}` : "";
      const mineParam = isMine ? "&mine=true" : "";
      const res = await fetch(`/api/suggestions?uuid=${uuid}&page=${pageNum}&sort=${currentSort}${labelParam}${mineParam}`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setSuggestions(data.suggestions || []);
        } else {
          setSuggestions(prev => [...prev, ...(data.suggestions || [])]);
        }
        setHasMore(data.hasMore);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchSuggestions(1, sort, labelFilter, mineFilter);
  }, [fetchSuggestions, sort, labelFilter, mineFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const currentLoader = loaderRef.current;
    if (!currentLoader || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setPage(prev => {
          const next = prev + 1;
          fetchSuggestions(next, sort, labelFilter, mineFilter);
          return next;
        });
      }
    }, { threshold: 0.1 });

    observer.observe(currentLoader);

    return () => {
      observer.unobserve(currentLoader);
    };
  }, [hasMore, loading, loadingMore, fetchSuggestions, sort, labelFilter, mineFilter]);

  // Observer for sticky form
  useEffect(() => {
    const currentForm = mainFormRef.current;
    if (!currentForm) return;

    const stickyObserver = new IntersectionObserver(
      ([entry]) => {
        // If the form is less than 0 intersection, it's out of view
        setIsStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    stickyObserver.observe(currentForm);
    return () => stickyObserver.unobserve(currentForm);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const cd = checkCooldown();
      if (!cd.ok && cd.remainingMs) {
        setCooldownRemaining(Math.ceil(cd.remainingMs / 1000));
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newContent.trim()) {
      setError("La sugerencia no puede estar vacía.");
      return;
    }

    if (!selectedLabel) {
      setError("Debes elegir una etiqueta antes de publicar.");
      return;
    }

    const validation = validateContent(newContent);
    if (!validation.ok) {
      setError(validation.error!);
      return;
    }

    if (cooldownRemaining > 0) {
      setError(`Debes esperar ${cooldownRemaining}s para volver a publicar.`);
      return;
    }

    if (checkDuplicate(newContent)) {
      setError("Por favor no envíes contenido duplicado.");
      return;
    }

    setSubmitting(true);
    const uuid = getUserUUID();

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uuid_author: uuid, content: newContent, label: selectedLabel }),
      });

      if (res.ok) {
        const data = await res.json();
        // Insert new post at top with isNew flag
        
        // We get the profile info from localStorage for immediate UI update
        let authorProfile = undefined;
        try {
          const profileStr = localStorage.getItem("votivia_profile_cache");
          if (profileStr) {
            authorProfile = JSON.parse(profileStr);
          }
        } catch {}

        const newSuggestion = {
          ...data.suggestion,
          score: 0,
          userVote: 0,
          author: authorProfile,
          label: selectedLabel,
          isNew: true
        };

        setSuggestions(prev => [newSuggestion, ...prev]);
        setNewContent("");
        setSelectedLabel("");
        setCooldown();
        markAsPosted(newContent);
      } else {
        const data = await res.json();
        setError(data.error || "Ocurrió un error.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  const scrollToPost = async (id: string, commentId?: string) => {
    const handleScrollAndFlash = (postId: string, cId?: string) => {
      const el = document.getElementById(`suggestion-${postId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (!cId) {
          el.classList.add("animate-border-fade");
          setTimeout(() => el?.classList.remove("animate-border-fade"), 2000);
        } else {
          // Open comments if not open
          const toggleBtn = document.getElementById(`toggle-comments-${postId}`);
          if (toggleBtn && toggleBtn.textContent?.includes("+ Respuestas")) {
            toggleBtn.click();
          }
          
          // Wait for render
          setTimeout(() => {
            const commentEl = document.getElementById(`comment-${cId}`);
            if (commentEl) {
              commentEl.scrollIntoView({ behavior: "smooth", block: "center" });
              commentEl.classList.add("animate-flash-comment");
              setTimeout(() => commentEl.classList.remove("animate-flash-comment"), 2000);
            }
          }, 400);
        }
      }
    };

    let el = document.getElementById(`suggestion-${id}`);
    if (el) {
      handleScrollAndFlash(id, commentId);
      return;
    }

    // If not found, keep fetching next page until found or no more
    let currentHasMore = hasMore;
    let currentPage = page;
    let found = false;

    // We can't easily wait for state update in a loop, so we'll fetch manually
    while (!found && currentHasMore) {
      const uuid = getUserUUID();
      const res = await fetch(`/api/suggestions?uuid=${uuid}&page=${currentPage + 1}&sort=${sort}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions((prev) => {
          const newItems = data.suggestions || [];
          return [...prev, ...newItems];
        });
        currentHasMore = data.hasMore;
        setHasMore(currentHasMore);
        currentPage++;
        setPage(currentPage);

        // Check if found in new data
        if ((data.suggestions || []).find((s: any) => s.id === id)) {
          found = true;
          // Wait for render
          setTimeout(() => {
            handleScrollAndFlash(id, commentId);
          }, 100);
        }
      } else {
        break;
      }
    }
  };

  return (
    <main className="flex flex-col flex-1 w-full max-w-4xl mx-auto px-4 py-8 relative">
      {/* Notification bell - fixed top right */}
      <div className="fixed top-4 right-4 z-50">
        <NotificationBell onNotificationClick={scrollToPost} />
      </div>

      <div className="flex items-center justify-between mb-6">
        <a href="/" className="text-sm font-sans font-bold text-muted hover:text-foreground">← Inicio</a>
        <h1 className="text-2xl font-extrabold uppercase text-foreground">
          VotiForo
        </h1>
        <div className="w-16" />
      </div>

      <form
        ref={mainFormRef}
        onSubmit={handleSubmit}
        className="mb-6 bg-[#1c1c1c] p-4 border-[3px] border-black flex flex-col gap-3 rounded-none"
      >
        {/* Label selector */}
        <div className="flex gap-2 flex-wrap">
          {LABELS.map(lbl => (
            <button
              key={lbl.value}
              type="button"
              onClick={() => setSelectedLabel(lbl.value)}
              className={`px-4 py-1.5 text-xs font-black uppercase border-[2px] border-black rounded-full transition-all ${
                selectedLabel === lbl.value ? "scale-105 shadow-sm" : "opacity-60 hover:opacity-100"
              }`}
              style={{
                backgroundColor: selectedLabel === lbl.value ? lbl.bg : "transparent",
                color: selectedLabel === lbl.value ? lbl.text : "inherit",
              }}
            >
              {lbl.display}
            </button>
          ))}
        </div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder={
            selectedLabel === "idea" ? "Escribir una idea de video" :
            selectedLabel === "sugerencia" ? "Escribe una opinión o ayuda a la comunidad" :
            selectedLabel === "no_se" ? "Escribe lo que quieras" :
            "Escribir una idea de video"
          }
          className="w-full h-24 border-[3px] border-black bg-background text-foreground p-2 resize-none focus:outline-none font-sans font-bold rounded-none"
          maxLength={MAX_CONTENT_LENGTH}
        />
        <div className="flex justify-between items-center">
          <span className="text-xs font-sans font-bold text-muted">
            {newContent.length} / {MAX_CONTENT_LENGTH}
          </span>
          <button
            type="submit"
            disabled={submitting || cooldownRemaining > 0}
            className="bg-surface text-foreground font-black text-sm uppercase px-4 py-2 border-[3px] border-black hover:bg-foreground hover:text-background transition-colors disabled:opacity-50 rounded-xl"
          >
            {submitting ? "..." : cooldownRemaining > 0 ? `Espera ${cooldownRemaining}s` : "Publicar"}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs font-sans font-bold">{error}</p>}
      </form>

      {/* Filter bar: sort select + label pills all in one row */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="bg-background border-[2px] border-black text-xs font-bold px-2 py-1.5 rounded hover:bg-surface transition-colors focus:outline-none shrink-0"
        >
          <option value="recomendados">Recomendados</option>
          <option value="mas_popular">Más populares</option>
          <option value="recientes">Recientes</option>
        </select>
        {LABEL_FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => {
              setLabelFilter(opt.value);
              setPage(1);
            }}
            className={`px-3 py-1 text-xs font-black uppercase border-[2px] border-black rounded-full transition-colors ${
              labelFilter === opt.value
                ? "bg-foreground text-background scale-105"
                : "bg-transparent text-foreground hover:bg-surface"
            }`}
          >
            {opt.display}
          </button>
        ))}
        
        <button
          onClick={() => {
            setMineFilter(!mineFilter);
            setPage(1);
          }}
          className={`ml-auto px-3 py-1 text-xs font-black uppercase border-[2px] border-black rounded-full transition-colors ${
            mineFilter
              ? "bg-blue-500 text-white border-blue-700 scale-105"
              : "bg-transparent text-foreground hover:bg-surface"
          }`}
        >
          Mis Votiposts
        </button>
      </div>


      {/* Sticky Minimal Form */}
      <div
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 flex justify-center pointer-events-none ${
          isStickyVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="w-full max-w-4xl px-4 mt-2 pointer-events-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-[#1c1c1c] p-2 border-[3px] border-black flex flex-col sm:flex-row gap-2 shadow-lg"
          >
            <div className="flex gap-1 flex-wrap shrink-0 items-center">
              {LABELS.map(lbl => (
                <button
                  key={lbl.value}
                  type="button"
                  onClick={() => setSelectedLabel(lbl.value)}
                  className={`px-2 py-1 text-[10px] font-black uppercase border-[2px] border-black transition-all ${
                    selectedLabel === lbl.value ? "scale-105" : "opacity-60 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: selectedLabel === lbl.value ? lbl.bg : "transparent",
                    color: selectedLabel === lbl.value ? lbl.text : "inherit",
                  }}
                >
                  {lbl.display}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Escribe tu idea..."
              className="flex-1 border-[2px] border-black bg-background text-foreground px-2 py-1 focus:outline-none font-sans font-bold text-sm min-w-0"
              maxLength={MAX_CONTENT_LENGTH}
            />
            <button
              type="submit"
              disabled={submitting || cooldownRemaining > 0}
              className="bg-foreground text-background font-black uppercase px-4 py-1 text-xs border-[2px] border-black hover:opacity-80 transition-opacity disabled:opacity-50 shrink-0"
            >
              {submitting ? "..." : cooldownRemaining > 0 ? `${cooldownRemaining}s` : "Enviar"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {loading && page === 1 ? (
          <p className="text-center font-sans font-bold text-muted">Cargando...</p>
        ) : suggestions.length === 0 ? (
          <p className="text-center font-sans font-bold text-muted">
            Sé el primero en proponer una idea.
          </p>
        ) : (
          suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              id={s.id}
              uuid_author={s.uuid_author}
              content={s.content}
              created_at={s.created_at}
              score={s.score}
              userVote={s.userVote}
              author={s.author}
              label={s.label}
              isNew={s.isNew}
              onDeleted={(id) => setSuggestions(prev => prev.filter(x => x.id !== id))}
            />
          ))
        )}
      </div>

      {/* Loader target for infinite scroll */}
      {hasMore && !loading && (
        <div ref={loaderRef} className="py-8 flex justify-center items-center">
          {loadingMore && <div className="text-muted font-sans font-bold animate-pulse">Cargando más...</div>}
        </div>
      )}
      
      {!hasMore && suggestions.length > 0 && (
        <div className="py-8 text-center text-muted font-sans font-bold text-sm">
          No hay más sugerencias.
        </div>
      )}
    </main>
  );
}
