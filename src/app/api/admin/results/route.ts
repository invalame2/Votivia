import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch polls
  const { data: polls } = await supabaseAdmin
    .from("poll_questions")
    .select(`
      id,
      question,
      category,
      option_a_text,
      option_b_text
    `)
    .order("order", { ascending: true });

  const { data: pollVotes } = await supabaseAdmin
    .from("poll_votes")
    .select("question_id, selected_option");

  const pollResults = (polls || []).map((p: any) => {
    const votes = (pollVotes || []).filter((v: any) => v.question_id === p.id);
    const votesA = votes.filter((v: any) => v.selected_option === "a").length;
    const votesB = votes.filter((v: any) => v.selected_option === "b").length;
    const total = votesA + votesB;
    const pctA = total > 0 ? Math.round((votesA / total) * 100) : 0;
    const pctB = total > 0 ? Math.round((votesB / total) * 100) : 0;

    return {
      id: p.id,
      question: p.question,
      category: p.category,
      option_a_text: p.option_a_text,
      option_b_text: p.option_b_text,
      votes_a: votesA,
      votes_b: votesB,
      total,
      pct_a: pctA,
      pct_b: pctB,
    };
  });

  const { data: suggestions } = await supabaseAdmin
    .from("suggestions")
    .select(`
      id, 
      content, 
      created_at,
      profiles ( username, tag )
    `)
    .order("created_at", { ascending: false });

  const { data: suggestionVotes } = await supabaseAdmin
    .from("suggestion_votes")
    .select("suggestion_id, vote");

  const { data: comments } = await supabaseAdmin
    .from("suggestion_comments")
    .select("suggestion_id");

  const suggestionResults = (suggestions || []).map((s: any) => {
    const sVotes = (suggestionVotes || []).filter((v: any) => v.suggestion_id === s.id);
    const score = sVotes.reduce((acc: number, v: any) => acc + v.vote, 0);
    const commentCount = (comments || []).filter((c: any) => c.suggestion_id === s.id).length;

    return {
      id: s.id,
      content: s.content,
      created_at: s.created_at,
      score,
      comment_count: commentCount,
      author: s.profiles ? `${s.profiles.username}#${s.profiles.tag}` : "Anónimo",
    };
  });

  return Response.json({
    polls: pollResults,
    suggestions: suggestionResults,
  });
}

export async function DELETE(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const id = body.id;
  const ids = body.ids || (id ? [id] : []);

  if (ids.length === 0) {
    return Response.json({ error: "Missing suggestion ID" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("suggestions")
    .delete()
    .in("id", ids);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
