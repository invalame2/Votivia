import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get("uuid");
  if (!uuid) return Response.json({ error: "Missing uuid" }, { status: 400 });

  // 1. Get all suggestions authored by this user
  const { data: suggestions } = await supabase
    .from("suggestions")
    .select("id, content, created_at")
    .eq("uuid_author", uuid);

  if (!suggestions || suggestions.length === 0) {
    return Response.json({ notifications: [] });
  }

  const suggestionIds = suggestions.map((s) => s.id);

  // 2. Get votes for these suggestions
  const { data: votes } = await supabase
    .from("suggestion_votes")
    .select("suggestion_id, vote")
    .in("suggestion_id", suggestionIds);

  // Calculate scores
  const scoreMap: Record<string, number> = {};
  for (const v of votes || []) {
    scoreMap[v.suggestion_id] = (scoreMap[v.suggestion_id] || 0) + v.vote;
  }

  // 3. Get comments for these suggestions not by the author
  const { data: comments } = await supabase
    .from("suggestion_comments")
    .select("id, suggestion_id, created_at")
    .in("suggestion_id", suggestionIds)
    .neq("uuid_author", uuid);

  const notifications = [];

  for (const s of suggestions) {
    // Check for upvote notification
    if ((scoreMap[s.id] || 0) >= 5) {
      notifications.push({
        id: `upvote_${s.id}`,
        suggestion_id: s.id,
        type: "upvote",
        message: "¡Tu publicación alcanzó 5 votos!",
        created_at: s.created_at, // Approximation, we don't have exact time it hit 5
      });
    }
  }

  // Add comment notifications
  for (const c of comments || []) {
    notifications.push({
      id: `comment_${c.id}`,
      suggestion_id: c.suggestion_id,
      type: "comment",
      message: "Alguien comentó en tu publicación.",
      created_at: c.created_at,
    });
  }

  // Sort by created_at desc
  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return Response.json({ notifications });
}
