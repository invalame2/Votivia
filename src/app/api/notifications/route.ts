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

  const suggestionIds = (suggestions || []).map((s) => s.id);

  // 1.5 Get all comments authored by this user
  const { data: myComments } = await supabase
    .from("suggestion_comments")
    .select("id")
    .eq("uuid_author", uuid);

  const myCommentIds = (myComments || []).map((c) => c.id);

  const notifications = [];

  // 2. Get votes for these suggestions
  if (suggestionIds.length > 0) {
    const { data: votes } = await supabase
      .from("suggestion_votes")
      .select("suggestion_id, vote")
      .in("suggestion_id", suggestionIds);

    // Calculate scores
    const scoreMap: Record<string, number> = {};
    for (const v of votes || []) {
      scoreMap[v.suggestion_id] = (scoreMap[v.suggestion_id] || 0) + v.vote;
    }

    for (const s of suggestions || []) {
      const score = scoreMap[s.id] || 0;
      
      if (score >= 1) {
        notifications.push({
          id: `upvote_${s.id}_1`,
          suggestion_id: s.id,
          type: "upvote",
          message: "¡Obtuviste tu primer voto!",
          created_at: s.created_at, // Approximation
        });
      }
      
      const maxTens = Math.floor(score / 10) * 10;
      for (let i = 10; i <= maxTens; i += 10) {
        notifications.push({
          id: `upvote_${s.id}_${i}`,
          suggestion_id: s.id,
          type: "upvote",
          message: `¡Tu publicación alcanzó ${i} votos!`,
          created_at: s.created_at,
        });
      }
    }
  }

  // 3. Get comments for these suggestions (or replies to user's comments) not by the author
  let allCommentsToNotify: any[] = [];
  
  if (suggestionIds.length > 0) {
    const { data: commentsOnPosts } = await supabase
      .from("suggestion_comments")
      .select("id, suggestion_id, parent_id, content, created_at, profiles(username)")
      .in("suggestion_id", suggestionIds)
      .neq("uuid_author", uuid);
    if (commentsOnPosts) allCommentsToNotify.push(...commentsOnPosts);
  }

  if (myCommentIds.length > 0) {
    const { data: repliesToMyComments } = await supabase
      .from("suggestion_comments")
      .select("id, suggestion_id, parent_id, content, created_at, profiles(username)")
      .in("parent_id", myCommentIds)
      .neq("uuid_author", uuid);
    
    if (repliesToMyComments) {
      // Avoid duplicates if they were already included in commentsOnPosts (e.g. replying to my comment on my own post)
      const existingIds = new Set(allCommentsToNotify.map(c => c.id));
      for (const rep of repliesToMyComments) {
        if (!existingIds.has(rep.id)) {
          allCommentsToNotify.push(rep);
        }
      }
    }
  }

  // Add comment notifications
  for (const c of allCommentsToNotify) {
    const username = (c.profiles as any)?.username || "Anónimo";
    const snippet = c.content.length > 40 ? c.content.substring(0, 37) + "..." : c.content;
    const isReply = !!c.parent_id;
    const actionText = isReply ? "te respondió" : "comentó";

    notifications.push({
      id: `comment_${c.id}`,
      suggestion_id: c.suggestion_id,
      comment_id: c.id,
      type: "comment",
      message: `${username} ${actionText}: "${snippet}"`,
      created_at: c.created_at,
    });
  }

  // Sort by created_at desc
  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Limit to 30 notifications
  return Response.json({ notifications: notifications.slice(0, 30) });
}
