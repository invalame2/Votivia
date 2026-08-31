import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { suggestion_id, uuid_voter, vote } = body;

  if (!suggestion_id || !uuid_voter || vote === undefined) {
    return Response.json(
      { error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  if (![1, -1, 0].includes(vote)) {
    return Response.json({ error: "Voto inválido." }, { status: 400 });
  }

  if (vote === 0) {
    // Remove vote
    await supabase
      .from("suggestion_votes")
      .delete()
      .eq("suggestion_id", suggestion_id)
      .eq("uuid_voter", uuid_voter);
  } else {
    // Upsert vote
    const { data: existing } = await supabase
      .from("suggestion_votes")
      .select("id")
      .eq("suggestion_id", suggestion_id)
      .eq("uuid_voter", uuid_voter)
      .single();

    if (existing) {
      await supabase
        .from("suggestion_votes")
        .update({ vote })
        .eq("suggestion_id", suggestion_id)
        .eq("uuid_voter", uuid_voter);
    } else {
      await supabase
        .from("suggestion_votes")
        .insert({ suggestion_id, uuid_voter, vote });
    }
  }

  // Recalculate score
  const { data: allVotes } = await supabase
    .from("suggestion_votes")
    .select("vote")
    .eq("suggestion_id", suggestion_id);

  const newScore = (allVotes || []).reduce(
    (sum, v) => sum + v.vote,
    0
  );

  return Response.json({ newScore });
}
