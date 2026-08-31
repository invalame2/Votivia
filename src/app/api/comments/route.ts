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
  const suggestionId = request.nextUrl.searchParams.get("suggestion_id");
  const countOnly = request.nextUrl.searchParams.get("count_only") === "true";

  if (!suggestionId) {
    return Response.json(
      { error: "suggestion_id requerido." },
      { status: 400 }
    );
  }

  // Fast count-only path for displaying counts without loading full comments
  if (countOnly) {
    const { count, error } = await supabase
      .from("suggestion_comments")
      .select("*", { count: "exact", head: true })
      .eq("suggestion_id", suggestionId);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ count: count ?? 0 });
  }

  const { data: comments, error } = await supabase
    .from("suggestion_comments")
    .select(`
      *,
      profiles (
        username,
        tag,
        color
      )
    `)
    .eq("suggestion_id", suggestionId)
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ comments: comments || [] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { suggestion_id, parent_id, uuid_author, content } = body;

  if (!suggestion_id || !uuid_author || !content) {
    return Response.json(
      { error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  const trimmed = content.trim();
  if (trimmed.length === 0 || trimmed.length > 280) {
    return Response.json(
      { error: "Contenido inválido." },
      { status: 400 }
    );
  }

  const scrubbed = scrubContent(trimmed);

  const { data, error } = await supabase
    .from("suggestion_comments")
    .insert({
      suggestion_id,
      parent_id: parent_id || null,
      uuid_author,
      content: scrubbed,
    })
    .select(`
      *,
      profiles (
        username,
        tag,
        color
      )
    `)
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ comment: data });
}
