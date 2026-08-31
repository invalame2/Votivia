"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PollCard from "@/components/PollCard";
import { getUserUUID } from "@/lib/uuid";
import { ensureProfile } from "@/lib/profile";

const COMPLETED_KEY = "votivia_polls_completed";
const ANSWERED_KEY = "votivia_polls_answered";

interface PollQuestion {
  id: string;
  question: string;
  option_a_text: string;
  option_a_image: string | null;
  option_b_text: string;
  option_b_image: string | null;
}

export default function EncuestasPage() {
  const [questions, setQuestions] = useState<PollQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    ensureProfile();
  }, []);

  const loadQuestions = useCallback(async () => {
    try {
      const uuid = getUserUUID();
      const res = await fetch(`/api/polls?uuid=${uuid}`);
      if (res.ok) {
        const data = await res.json();
        const unanswered: PollQuestion[] = data.questions || [];

        if (unanswered.length === 0) {
          setCompleted(true);
        } else {
          setQuestions(unanswered);
          setCurrentIndex(0);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function handleVote(option: "a" | "b") {
    if (voting) return;
    const current = questions[currentIndex];
    if (!current) return;

    const uuid = getUserUUID();
    setVoting(true);

    try {
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: current.id,
          uuid_voter: uuid,
          selected_option: option,
        }),
      });

      if (res.ok) {
        // Mark as answered in localStorage
        if (typeof window !== "undefined") {
          const answered = JSON.parse(
            localStorage.getItem(ANSWERED_KEY) || "[]"
          ) as string[];
          answered.push(current.id);
          localStorage.setItem(ANSWERED_KEY, JSON.stringify(answered));
        }

        // Advance
        if (currentIndex + 1 >= questions.length) {
          setCompleted(true);
          if (typeof window !== "undefined") {
            localStorage.setItem(COMPLETED_KEY, "1");
          }
        } else {
          setCurrentIndex((prev) => prev + 1);
          // Preload images for the question AFTER next (lookahead of 2)
          const lookahead = questions[currentIndex + 2];
          if (lookahead) {
            [lookahead.option_a_image, lookahead.option_b_image].forEach(src => {
              if (src) {
                const img = new window.Image();
                img.src = src;
              }
            });
          }
        }
      }
    } catch {
      // Silently fail
    } finally {
      setVoting(false);
    }
  }

  return (
    <main className="flex flex-col flex-1 w-full max-w-6xl mx-auto px-4 py-6" style={{minHeight: 'calc(100vh - 60px)'}}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="text-sm font-sans font-bold text-muted hover:text-foreground"
          id="back-home-polls"
        >
          ← Volver
        </Link>
        <h1 className="text-2xl font-extrabold uppercase font-sans text-foreground">
          Encuestas
        </h1>
        <div className="w-16" />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted font-sans font-bold">Cargando...</p>
        </div>
      ) : completed ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="border-[3px] border-black bg-surface p-8 text-center max-w-sm">
            <p className="text-xl font-black text-foreground mb-2 font-sans font-bold">
              ¡Gracias!
            </p>
            <p className="text-muted text-sm font-sans font-bold">
              Has completado todas las encuestas disponibles.
            </p>
          </div>
        </div>
      ) : questions[currentIndex] ? (
        <div className="flex flex-1 flex-col" style={{minHeight: '70vh'}}>
          <PollCard
            question={questions[currentIndex].question}
            optionAText={questions[currentIndex].option_a_text}
            optionAImage={questions[currentIndex].option_a_image}
            optionBText={questions[currentIndex].option_b_text}
            optionBImage={questions[currentIndex].option_b_image}
            onVote={handleVote}
            current={currentIndex + 1}
            total={questions.length}
          />
        </div>
      ) : null}
    </main>
  );
}
