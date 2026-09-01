import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
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
  const { data: suggestion } = await supabase
    .from("suggestions")
    .select("uuid_author")
    .eq("id", id)
    .single();

  if (!suggestion || suggestion.uuid_author !== uuid) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { error } = await supabase.from("suggestions").delete().eq("id", id);
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

// PATCH: admin-only label/category change
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { label } = body;

  const validLabels = ["idea", "sugerencia", "no_se"];
  if (!label || !validLabels.includes(label)) {
    return Response.json({ error: "Invalid label" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("suggestions")
    .update({ label })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
