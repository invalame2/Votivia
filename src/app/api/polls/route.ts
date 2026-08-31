import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get("uuid") || "";

  // Fetch active poll questions
  const { data: questions, error } = await supabase
    .from("poll_questions")
    .select("id, question, option_a_text, option_a_image, option_b_text, option_b_image")
    .eq("active", true)
    .order("order", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // If uuid provided, filter out already-answered questions
  if (uuid) {
    const { data: votes } = await supabase
      .from("poll_votes")
      .select("question_id")
      .eq("uuid_voter", uuid);

    const answeredIds = new Set((votes || []).map((v) => v.question_id));
    const unanswered = (questions || []).filter(
      (q) => !answeredIds.has(q.id)
    );
    return Response.json({ questions: unanswered });
  }

  return Response.json({ questions: questions || [] });
}
