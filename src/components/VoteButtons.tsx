"use client";

import { useState } from "react";
import { getUserUUID } from "@/lib/uuid";

interface VoteButtonsProps {
  suggestionId: string;
  initialScore: number;
  initialUserVote: number; // 0, or 1
}

export default function VoteButtons({
  suggestionId,
  initialScore,
  initialUserVote,
}: VoteButtonsProps) {
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);

  async function handleVote() {
    if (loading) return;

    const uuid = getUserUUID();
    const newVote = userVote === 1 ? 0 : 1; // Toggle between 1 and 0

    setLoading(true);
    try {
      const res = await fetch("/api/suggestions/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestion_id: suggestionId,
          uuid_voter: uuid,
          vote: newVote,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setScore(data.newScore);
        setUserVote(newVote);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`flex items-center h-7 border-[2px] border-black rounded-full overflow-hidden transition-transform active:scale-95 ${
        userVote === 1 ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"
      }`}
      aria-label="Upvote"
      id={`upvote-${suggestionId}`}
    >
      <div className={`px-2 py-1 font-black text-sm flex items-center justify-center border-r-[2px] ${
        userVote === 1 ? "border-background" : "border-black"
      }`}>
        ▲
      </div>
      <div className="px-3 py-1 font-sans font-black text-sm">
        {score}
      </div>
    </button>
  );
}
