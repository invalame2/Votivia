"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLogin from "@/components/AdminLogin";
import ManagePolls from "@/components/ManagePolls";

interface PollResult {
  id: string;
  question: string;
  category: string;
  option_a_text: string;
  option_b_text: string;
  votes_a: number;
  votes_b: number;
  total: number;
  pct_a: number;
  pct_b: number;
}

interface SuggestionResult {
  id: string;
  content: string;
  score: number;
  created_at: string;
  comment_count: number;
}

interface ReportResult {
  report_id: string;
  created_at: string;
  comment_id: string;
  content: string;
  author: string;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pollResults, setPollResults] = useState<PollResult[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);
  const [reports, setReports] = useState<ReportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"polls" | "manage-polls" | "suggestions" | "reports">("polls");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [lastSelectedSuggestion, setLastSelectedSuggestion] = useState<string | null>(null);

  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [lastSelectedReport, setLastSelectedReport] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("votivia_admin")) {
      setAuthenticated(true);
    }
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/results", { headers: { "x-admin-password": pass } });
      if (res.ok) {
        const data = await res.json();
        setPollResults(data.polls || []);
        setSuggestions(data.suggestions || []);
      }
      
      const repRes = await fetch("/api/admin/reports", { headers: { "x-admin-password": pass } });
      if (repRes.ok) {
        const repData = await repRes.json();
        setReports(repData.reports || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchResults();
    }
  }, [authenticated, fetchResults]);

  async function handleReportAction(action: "delete_content" | "ignore_report", id: string, targetType?: string) {
    if (!confirm(`¿Estás seguro de que quieres ${action === "delete_content" ? "borrar este contenido" : "ignorar este reporte"}?`)) return;
    
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/reports", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass
        },
        body: JSON.stringify({ action, id, target_type: targetType })
      });
      
      if (res.ok) {
        fetchResults(); // refresh
      } else {
        alert("Error al procesar la acción.");
      }
    } catch {
      alert("Error de conexión.");
    }
  }

  async function handleDeleteSuggestion(id: string) {
    if (!confirm("¿Seguro que querés eliminar esta sugerencia permanentemente?")) return;
    
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass
        },
        body: JSON.stringify({ id })
      });
      
      if (res.ok) {
        fetchResults();
      } else {
        alert("Error al eliminar la sugerencia.");
      }
    } catch {
      alert("Error de conexión.");
    }
  }

  async function handleBulkDeleteSuggestions() {
    if (selectedSuggestions.size === 0) return;
    if (!confirm(`¿Seguro que querés eliminar las ${selectedSuggestions.size} sugerencias seleccionadas permanentemente?`)) return;
    
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/results", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass
        },
        body: JSON.stringify({ ids: Array.from(selectedSuggestions) })
      });
      
      if (res.ok) {
        setSelectedSuggestions(new Set());
        setLastSelectedSuggestion(null);
        fetchResults();
      } else {
        alert("Error al eliminar sugerencias.");
      }
    } catch {
      alert("Error de conexión.");
    }
  }

  async function handleBulkReportAction(action: "delete_content" | "ignore_report") {
    if (selectedReports.size === 0) return;
    if (!confirm(`¿Estás seguro de que quieres ${action === "delete_content" ? "borrar el contenido de" : "ignorar"} los ${selectedReports.size} reportes seleccionados?`)) return;
    
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      
      let bodyData: any = { action };
      if (action === "ignore_report") {
        bodyData.ids = Array.from(selectedReports);
      } else {
        // map selected reports to their items
        const items = Array.from(selectedReports).map(reportId => {
          const r = reports.find(x => x.report_id === reportId);
          return { id: r?.target_id, target_type: r?.target_type };
        }).filter(x => x.id);
        bodyData.items = items;
      }

      const res = await fetch("/api/admin/reports", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass
        },
        body: JSON.stringify(bodyData)
      });
      
      if (res.ok) {
        setSelectedReports(new Set());
        setLastSelectedReport(null);
        fetchResults(); // refresh
      } else {
        alert("Error al procesar la acción.");
      }
    } catch {
      alert("Error de conexión.");
    }
  }


  if (!authenticated) {
    return (
      <main className="flex flex-col flex-1 px-4 py-8">
        <AdminLogin onSuccess={() => setAuthenticated(true)} />
      </main>
    );
  }

  const categories = ["all", ...new Set(pollResults.map((p) => p.category).filter(Boolean))];
  const filteredPolls = categoryFilter === "all" ? pollResults : pollResults.filter((p) => p.category === categoryFilter);
  const sortedSuggestions = [...suggestions].sort((a, b) => b.score - a.score);

  const handleSuggestionClick = (e: React.MouseEvent, id: string, index: number) => {
    if ((e.target as HTMLElement).closest("button")) return; // Ignore if clicking a button
    
    const newSelected = new Set(selectedSuggestions);
    
    if (e.shiftKey && lastSelectedSuggestion !== null) {
      const lastIndex = sortedSuggestions.findIndex(s => s.id === lastSelectedSuggestion);
      if (lastIndex !== -1) {
        const start = Math.min(lastIndex, index);
        const end = Math.max(lastIndex, index);
        for (let i = start; i <= end; i++) {
          newSelected.add(sortedSuggestions[i].id);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setLastSelectedSuggestion(id);
    } else {
      if (newSelected.has(id) && newSelected.size === 1) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add(id);
      }
      setLastSelectedSuggestion(id);
    }
    
    setSelectedSuggestions(newSelected);
  };

  const handleReportClick = (e: React.MouseEvent, id: string, index: number) => {
    if ((e.target as HTMLElement).closest("button")) return; // Ignore if clicking a button
    
    const newSelected = new Set(selectedReports);
    
    if (e.shiftKey && lastSelectedReport !== null) {
      const lastIndex = reports.findIndex(r => r.report_id === lastSelectedReport);
      if (lastIndex !== -1) {
        const start = Math.min(lastIndex, index);
        const end = Math.max(lastIndex, index);
        for (let i = start; i <= end; i++) {
          newSelected.add(reports[i].report_id);
        }
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelected.has(id)) newSelected.delete(id);
      else newSelected.add(id);
      setLastSelectedReport(id);
    } else {
      if (newSelected.has(id) && newSelected.size === 1) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add(id);
      }
      setLastSelectedReport(id);
    }
    
    setSelectedReports(newSelected);
  };

  return (
    <main className="flex flex-col flex-1 w-full max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black uppercase text-foreground mb-6 text-center">
        Panel Admin
      </h1>

      {/* Tabs */}
      <div className="flex border-[3px] border-black mb-6 rounded-xl overflow-hidden">
        <button
          onClick={() => setActiveTab("polls")}
          className={`flex-1 py-2 font-sans font-bold text-sm uppercase ${
            activeTab === "polls" ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"
          }`}
        >
          Resultados Encuestas
        </button>
        <button
          onClick={() => setActiveTab("manage-polls")}
          className={`flex-1 py-2 font-sans font-bold text-sm uppercase border-l-[3px] border-black ${
            activeTab === "manage-polls" ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"
          }`}
        >
          Gestionar Encuestas
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`flex-1 py-2 font-sans font-bold text-sm uppercase border-l-[3px] border-black ${
            activeTab === "suggestions" ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"
          }`}
        >
          Sugerencias
        </button>
        <button
          onClick={() => setActiveTab("reports")}
          className={`flex-1 py-2 font-sans font-bold text-sm uppercase border-l-[3px] border-black ${
            activeTab === "reports" ? "bg-red-600 text-white" : "bg-surface text-foreground hover:bg-surface-hover"
          }`}
        >
          Reportes ({reports.length})
        </button>
      </div>

      {loading ? (
        <p className="text-center text-muted font-sans font-bold">Cargando datos...</p>
      ) : activeTab === "manage-polls" ? (
        <ManagePolls />
      ) : activeTab === "polls" ? (
        <>
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 text-xs font-sans font-bold border-[3px] border-black uppercase rounded-xl ${
                    categoryFilter === cat ? "bg-foreground text-background" : "bg-surface text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {cat === "all" ? "Todas" : cat}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse rounded-xl overflow-hidden border-[3px] border-black">
              <thead>
                <tr className="border-b-[3px] border-black bg-surface">
                  <th className="text-left p-3 font-sans font-bold text-sm text-foreground uppercase border-r-[3px] border-black">
                    Pregunta
                  </th>
                  <th className="p-3 font-sans font-bold text-sm text-foreground uppercase border-r-[3px] border-black w-28">
                    Opción A
                  </th>
                  <th className="p-3 font-sans font-bold text-sm text-foreground uppercase border-r-[3px] border-black w-28">
                    Opción B
                  </th>
                  <th className="p-3 font-sans font-bold text-sm text-foreground uppercase w-20">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPolls.map((poll) => (
                  <tr key={poll.id} className="border-b-[3px] last:border-b-0 border-black bg-background">
                    <td className="p-3 text-sm text-foreground border-r-[3px] border-black">
                      <div className="font-bold">{poll.question}</div>
                      {poll.category && (
                        <span className="text-xs text-muted font-sans font-bold">[{poll.category}]</span>
                      )}
                    </td>
                    <td className="p-3 text-center border-r-[3px] border-black">
                      <div className="font-sans font-black text-sm text-foreground">{poll.votes_a}</div>
                      <div className="font-sans font-bold text-xs text-muted">{poll.pct_a}%</div>
                      <div className="text-xs text-muted mt-1">{poll.option_a_text}</div>
                    </td>
                    <td className="p-3 text-center border-r-[3px] border-black">
                      <div className="font-sans font-black text-sm text-foreground">{poll.votes_b}</div>
                      <div className="font-sans font-bold text-xs text-muted">{poll.pct_b}%</div>
                      <div className="text-xs text-muted mt-1">{poll.option_b_text}</div>
                    </td>
                    <td className="p-3 text-center font-sans font-black text-sm text-foreground">
                      {poll.total}
                    </td>
                  </tr>
                ))}
                {filteredPolls.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted font-sans font-bold bg-background">
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : activeTab === "suggestions" ? (
        <div className="space-y-3">
          {selectedSuggestions.size > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleBulkDeleteSuggestions}
                className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-md border-[3px] border-black hover:bg-red-700 transition-colors"
              >
                Eliminar Seleccionados ({selectedSuggestions.size})
              </button>
            </div>
          )}
          {sortedSuggestions.map((s, idx) => (
            <div
              key={s.id}
              onClick={(e) => handleSuggestionClick(e, s.id, idx)}
              className={`border-[3px] rounded-xl p-3 flex items-start gap-3 cursor-pointer select-none transition-colors ${
                selectedSuggestions.has(s.id) ? "border-foreground bg-surface-hover" : "border-black bg-surface"
              }`}
            >
              <span className="font-sans font-black text-sm text-foreground w-10 text-center shrink-0 border-[3px] border-black rounded-md bg-background py-1">
                {s.score}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground break-words">{s.content}</p>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted font-sans font-bold">
                    {new Date(s.created_at).toLocaleDateString("es")} · {s.comment_count} respuestas
                  </p>
                  <button
                    onClick={() => handleDeleteSuggestion(s.id)}
                    className="text-muted hover:text-red-500 transition-colors p-1"
                    title="Eliminar sugerencia"
                    aria-label="Eliminar sugerencia"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {sortedSuggestions.length === 0 && (
            <p className="text-center text-muted font-sans font-bold">Sin sugerencias aún.</p>
          )}
        </div>
      ) : (
        /* Reports List */
        <div className="space-y-3">
          {selectedReports.size > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => handleBulkReportAction("delete_content")}
                className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-md border-[3px] border-black hover:bg-red-700 transition-colors"
              >
                Eliminar Contenido ({selectedReports.size})
              </button>
              <button
                onClick={() => handleBulkReportAction("ignore_report")}
                className="bg-surface text-foreground font-black text-xs px-4 py-2 rounded-md border-[3px] border-black hover:bg-foreground hover:text-background transition-colors"
              >
                Ignorar Reportes ({selectedReports.size})
              </button>
            </div>
          )}
          {reports.map((r: any, idx) => (
            <div
              key={r.report_id}
              onClick={(e) => handleReportClick(e, r.report_id, idx)}
              className={`border-[3px] rounded-xl p-4 cursor-pointer select-none transition-colors ${
                selectedReports.has(r.report_id) ? "border-red-500 bg-surface-hover" : "border-red-900 bg-surface"
              }`}
            >
              <p className="text-xs text-red-500 font-bold mb-2 uppercase">
                {r.target_type === "suggestion" ? "Sugerencia reportada" : "Comentario reportado"} por: {r.author}
              </p>
              <p className="text-sm text-foreground bg-background border-[3px] border-black rounded p-2 mb-3">
                {r.content}
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => handleReportAction("delete_content", r.target_id, r.target_type)}
                  className="bg-red-600 text-white font-black text-xs px-3 py-1 rounded-md border-[3px] border-black hover:bg-red-700"
                >
                  Eliminar Contenido
                </button>
                <button
                  onClick={() => handleReportAction("ignore_report", r.report_id)}
                  className="bg-surface text-foreground font-bold text-xs px-3 py-1 rounded-md border-[3px] border-black hover:bg-foreground hover:text-background"
                >
                  Ignorar Reporte
                </button>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <p className="text-center text-muted font-sans font-bold">No hay reportes pendientes.</p>
          )}
        </div>
      )}
    </main>
  );
}
