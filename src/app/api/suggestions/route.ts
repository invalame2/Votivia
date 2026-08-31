import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

function scrubContent(text: string): string {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      return url;
    }
    return "[link removido]";
  });
}

export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get("uuid") || "";
  const pageStr = request.nextUrl.searchParams.get("page") || "1";
  const limit = 20;
  const page = parseInt(pageStr, 10) || 1;

  // Fetch all suggestions with profiles (In-memory sorting)
  // WARNING: This will be slow with 10k+ rows. A DB View is recommended for production scale.
  const { data: suggestions, error } = await supabase
    .from("suggestions")
    .select(`
      *,
      profiles (
        username,
        tag,
        color
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Fetch vote scores
  const { data: votes } = await supabase
    .from("suggestion_votes")
    .select("suggestion_id, uuid_voter, vote");

  // Calculate scores and user votes
  const voteMap: Record<string, { score: number; userVote: number }> = {};
  for (const v of votes || []) {
    if (!voteMap[v.suggestion_id]) {
      voteMap[v.suggestion_id] = { score: 0, userVote: 0 };
    }
    voteMap[v.suggestion_id].score += v.vote;
    if (v.uuid_voter === uuid) {
      voteMap[v.suggestion_id].userVote = v.vote;
    }
  }

  const sort = request.nextUrl.searchParams.get("sort") || "recomendados";
  const labelFilter = request.nextUrl.searchParams.get("label") || "";

  const enriched = (suggestions || []).map((s: any) => ({
    id: s.id,
    uuid_author: s.uuid_author,
    content: s.content,
    created_at: s.created_at,
    author: s.profiles,
    label: s.label || "sugerencia",
    score: voteMap[s.id]?.score || 0,
    userVote: voteMap[s.id]?.userVote || 0,
  }));

  // Label filter
  const filtered = labelFilter ? enriched.filter(s => s.label === labelFilter) : enriched;

  // Sort logic
  if (sort === "mas_popular") {
    filtered.sort((a, b) => b.score - a.score);
  } else if (sort === "recientes") {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    // Recomendados: Mix of score and recency.
    const now = Date.now();
    filtered.sort((a, b) => {
      const daysA = Math.max(0, 7 - (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const daysB = Math.max(0, 7 - (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return (b.score + daysB) - (a.score + daysA);
    });
  }

  // Pagination slice
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);
  const hasMore = startIndex + limit < filtered.length;

  return Response.json({ suggestions: paginated, hasMore });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { uuid_author, content, label } = body;

  if (!uuid_author || !content) {
    return Response.json(
      { error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  const validLabels = ["idea", "sugerencia", "no_se"];
  const safeLabel = validLabels.includes(label) ? label : "sugerencia";

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 280) {
    return Response.json(
      { error: "Contenido inválido." },
      { status: 400 }
    );
  }

  const scrubbed = scrubContent(trimmed);

  const { data, error } = await supabase
    .from("suggestions")
    .insert({ uuid_author, content: scrubbed, label: safeLabel })
    .select()
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ suggestion: data });
}
