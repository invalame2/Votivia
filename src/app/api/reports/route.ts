import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const { comment_id, suggestion_id, uuid_reporter } = await request.json();

  if ((!comment_id && !suggestion_id) || !uuid_reporter) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // Check if already reported
  let query = supabase.from("reports").select("id").eq("uuid_reporter", uuid_reporter);
  
  if (comment_id) query = query.eq("comment_id", comment_id);
  if (suggestion_id) query = query.eq("suggestion_id", suggestion_id);

  const { data: existing } = await query.single();

  if (existing) {
    return Response.json({ error: "Ya reportaste esto." }, { status: 409 });
  }

  const { error } = await supabase
    .from("reports")
    .insert({ comment_id: comment_id || null, suggestion_id: suggestion_id || null, uuid_reporter });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
