import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch reports with their comments and suggestions
  const { data: reports, error } = await supabaseAdmin
    .from("reports")
    .select(`
      id,
      created_at,
      suggestion_comments (
        id,
        content,
        profiles ( username, tag )
      ),
      suggestions (
        id,
        content,
        profiles ( username, tag )
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const formatted = (reports || []).map((r: any) => {
    if (r.suggestion_comments) {
      return {
        report_id: r.id,
        created_at: r.created_at,
        target_type: "comment",
        target_id: r.suggestion_comments.id,
        content: r.suggestion_comments.content,
        author: `${r.suggestion_comments.profiles?.username}#${r.suggestion_comments.profiles?.tag}`,
      };
    } else if (r.suggestions) {
      return {
        report_id: r.id,
        created_at: r.created_at,
        target_type: "suggestion",
        target_id: r.suggestions.id,
        content: r.suggestions.content,
        author: `${r.suggestions.profiles?.username}#${r.suggestions.profiles?.tag}`,
      };
    }
    return null;
  }).filter(Boolean); // Filter out orphans

  return Response.json({ reports: formatted });
}

export async function DELETE(request: NextRequest) {
  const pass = request.headers.get("x-admin-password");
  if (pass !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action, id, ids: bodyIds, target_type, items } = await request.json();
  // action: 'delete_content' or 'ignore_report'
  // items for bulk action: [{ id, target_type }] for delete_content, or just ids array for ignore_report

  if (action === "delete_content") {
    // If it's a bulk delete content, we might have mixed suggestions and comments, but for simplicity let's handle them sequentially or expect items array
    const targets = items || (id ? [{ id, target_type }] : []);
    
    for (const t of targets) {
      const table = t.target_type === "suggestion" ? "suggestions" : "suggestion_comments";
      await supabaseAdmin.from(table).delete().eq("id", t.id);
    }
    
    return Response.json({ ok: true });
  } else if (action === "ignore_report") {
    // Delete just the report
    const ids = bodyIds || (id ? [id] : []);
    const { error } = await supabaseAdmin
      .from("reports")
      .delete()
      .in("id", ids);

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
