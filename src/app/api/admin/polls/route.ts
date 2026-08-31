import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

// GET: list all poll questions (admin)
export async function GET(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("poll_questions")
    .select("id, question, category, option_a_text, option_a_image, option_b_text, option_b_image, active, order")
    .order("order", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ questions: data || [] });
}

// POST: create new poll question
export async function POST(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question, category, option_a_text, option_a_image, option_b_text, option_b_image, active } = body;

  if (!question || !option_a_text || !option_b_text) {
    return Response.json({ error: "Faltan campos requeridos." }, { status: 400 });
  }

  // Get next order value
  const { data: last } = await supabaseAdmin
    .from("poll_questions")
    .select("order")
    .order("order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (last?.order ?? 0) + 1;

  const { data, error } = await supabaseAdmin
    .from("poll_questions")
    .insert({
      question,
      category: category || null,
      option_a_text,
      option_a_image: option_a_image || null,
      option_b_text,
      option_b_image: option_b_image || null,
      active: active ?? true,
      order: nextOrder,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ question: data });
}

// PATCH: update existing poll question
export async function PATCH(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("poll_questions")
    .update(fields)
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ question: data });
}

// DELETE: remove poll question or entire category
export async function DELETE(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, category } = body;

  if (!id && !category) {
    return Response.json({ error: "Missing id or category" }, { status: 400 });
  }

  let error;
  if (category) {
    const res = await supabaseAdmin
      .from("poll_questions")
      .delete()
      .eq("category", category);
    error = res.error;
  } else {
    const res = await supabaseAdmin
      .from("poll_questions")
      .delete()
      .eq("id", id);
    error = res.error;
  }

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
