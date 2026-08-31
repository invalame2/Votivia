"use client";

import { useState, useEffect } from "react";

interface PollQuestion {
  id: string;
  question: string;
  category: string;
  option_a_text: string;
  option_a_image: string | null;
  option_b_text: string;
  option_b_image: string | null;
  active: boolean;
  order: number;
}

export default function ManagePolls() {
  const [questions, setQuestions] = useState<PollQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    question: "",
    category: "",
    option_a_text: "",
    option_a_image: "",
    option_b_text: "",
    option_b_image: "",
    active: true,
  });

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/polls", {
        headers: { "x-admin-password": pass },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleEdit = (q: PollQuestion) => {
    setEditingId(q.id);
    setFormData({
      question: q.question,
      category: q.category || "",
      option_a_text: q.option_a_text,
      option_a_image: q.option_a_image || "",
      option_b_text: q.option_b_text,
      option_b_image: q.option_b_image || "",
      active: q.active,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      question: "",
      category: "",
      option_a_text: "",
      option_a_image: "",
      option_b_text: "",
      option_b_image: "",
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question || !formData.option_a_text || !formData.option_b_text) {
      alert("La pregunta y los textos de las opciones son obligatorios.");
      return;
    }

    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const method = editingId ? "PATCH" : "POST";
      const body = editingId ? { id: editingId, ...formData } : formData;

      const res = await fetch("/api/admin/polls", {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass,
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        handleCancel();
        fetchQuestions();
      } else {
        alert("Error al guardar la encuesta.");
      }
    } catch {
      alert("Error de conexión.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que querés eliminar esta encuesta? Esto borrará sus votos.")) return;
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/polls", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass,
        },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchQuestions();
      } else {
        alert("Error al eliminar.");
      }
    } catch {
      alert("Error de conexión.");
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`¿Seguro que querés eliminar TODAS las encuestas de la categoría "${category}"? Esta acción no se puede deshacer.`)) return;
    try {
      const pass = localStorage.getItem("votivia_admin_pass") || "";
      const res = await fetch("/api/admin/polls", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": pass,
        },
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        fetchQuestions();
      } else {
        alert("Error al eliminar la categoría.");
      }
    } catch {
      alert("Error de conexión.");
    }
  };

  const uniqueCategories = Array.from(new Set(questions.map(q => q.category).filter(Boolean)));

  return (
    <div className="flex flex-col gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="border-[3px] border-black bg-surface p-6 rounded-xl flex flex-col gap-4">
        <h2 className="font-black text-xl uppercase mb-2">
          {editingId ? "Editar Encuesta" : "Crear Nueva Encuesta"}
        </h2>
        
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Pregunta (ej: ¿Cuál preferís?)"
            className="flex-1 bg-background border-[3px] border-black px-3 py-2 font-bold focus:outline-none"
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
          />
          <input
            type="text"
            placeholder="Sección/Categoría (opcional)"
            className="flex-1 md:max-w-xs bg-background border-[3px] border-black px-3 py-2 font-bold focus:outline-none"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2 border-[2px] border-black p-4 rounded-lg bg-background">
            <p className="font-black uppercase text-sm">Opción A</p>
            <input
              type="text"
              placeholder="Texto Opción A"
              className="bg-surface border-[2px] border-black px-3 py-1 font-bold focus:outline-none"
              value={formData.option_a_text}
              onChange={(e) => setFormData({ ...formData, option_a_text: e.target.value })}
            />
            <input
              type="text"
              placeholder="Link de Imagen A (opcional)"
              className="bg-surface border-[2px] border-black px-3 py-1 text-sm font-bold focus:outline-none"
              value={formData.option_a_image}
              onChange={(e) => setFormData({ ...formData, option_a_image: e.target.value })}
            />
          </div>

          <div className="flex-1 flex flex-col gap-2 border-[2px] border-black p-4 rounded-lg bg-background">
            <p className="font-black uppercase text-sm">Opción B</p>
            <input
              type="text"
              placeholder="Texto Opción B"
              className="bg-surface border-[2px] border-black px-3 py-1 font-bold focus:outline-none"
              value={formData.option_b_text}
              onChange={(e) => setFormData({ ...formData, option_b_text: e.target.value })}
            />
            <input
              type="text"
              placeholder="Link de Imagen B (opcional)"
              className="bg-surface border-[2px] border-black px-3 py-1 text-sm font-bold focus:outline-none"
              value={formData.option_b_image}
              onChange={(e) => setFormData({ ...formData, option_b_image: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            id="active-check"
            checked={formData.active}
            onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
            className="w-5 h-5 accent-black"
          />
          <label htmlFor="active-check" className="font-bold">Activa (visible al público)</label>
        </div>

        <div className="flex gap-4 mt-4">
          <button
            type="submit"
            className="bg-foreground text-background font-black uppercase px-6 py-2 border-[3px] border-black hover:opacity-80 transition-opacity rounded-lg"
          >
            {editingId ? "Guardar Cambios" : "Crear Encuesta"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="bg-surface text-foreground font-bold uppercase px-6 py-2 border-[3px] border-black hover:bg-background transition-colors rounded-lg"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* List */}
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-black text-xl uppercase mb-4">Eliminar Categorías</h2>
          {uniqueCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {uniqueCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleDeleteCategory(cat)}
                  className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-2 border-[2px] border-black rounded hover:bg-red-700 transition-colors"
                >
                  Borrar &quot;{cat}&quot;
                </button>
              ))}
            </div>
          ) : (
            <p className="font-bold text-muted text-sm">No hay categorías creadas.</p>
          )}
        </div>

        <div>
          <h2 className="font-black text-xl uppercase mb-4">Encuestas Existentes</h2>
          {loading ? (
            <p className="font-bold text-muted">Cargando...</p>
          ) : (
            <div className="flex flex-col gap-3">
              {questions.map((q) => (
                <div key={q.id} className="border-[3px] border-black bg-surface p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex-1">
                    <p className="font-black text-lg leading-tight mb-1">
                      {q.question} {!q.active && <span className="text-red-500 text-sm">(Inactiva)</span>}
                    </p>
                    <p className="text-sm font-bold text-muted mb-2">Sección: {q.category || "Ninguna"}</p>
                    <div className="flex gap-4 text-sm font-bold">
                      <span className="bg-background px-2 py-1 border-[2px] border-black rounded">A: {q.option_a_text}</span>
                      <span className="bg-background px-2 py-1 border-[2px] border-black rounded">B: {q.option_b_text}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(q)}
                      className="bg-surface text-foreground font-bold text-xs uppercase px-3 py-2 border-[2px] border-black rounded hover:bg-foreground hover:text-background transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="bg-red-600 text-white font-bold text-xs uppercase px-3 py-2 border-[2px] border-black rounded hover:bg-red-700 transition-colors"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
              {questions.length === 0 && <p className="font-bold text-muted">No hay encuestas creadas.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
