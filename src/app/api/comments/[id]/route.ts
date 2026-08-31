import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { uuid } = await request.json();

  if (!id || !uuid) {
    return Response.json({ error: "Missing data" }, { status: 400 });
  }

  // Ensure user is author
  const { data: comment } = await supabase
    .from("suggestion_comments")
    .select("uuid_author")
    .eq("id", id)
    .single();

  if (!comment || comment.uuid_author !== uuid) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase.from("suggestion_comments").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
