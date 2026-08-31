import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { question_id, uuid_voter, selected_option } = body;

  if (!question_id || !uuid_voter || !selected_option) {
    return Response.json(
      { error: "Faltan campos requeridos." },
      { status: 400 }
    );
  }

  if (!["a", "b"].includes(selected_option)) {
    return Response.json(
      { error: "Opción inválida." },
      { status: 400 }
    );
  }

  // Check if already voted
  const { data: existing } = await supabase
    .from("poll_votes")
    .select("id")
    .eq("question_id", question_id)
    .eq("uuid_voter", uuid_voter)
    .single();

  if (existing) {
    return Response.json(
      { error: "Ya votaste en esta pregunta." },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from("poll_votes")
    .insert({ question_id, uuid_voter, selected_option });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
