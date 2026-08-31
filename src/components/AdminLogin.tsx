"use client";

import { useState } from "react";

interface AdminLoginProps {
  onSuccess: () => void;
}

export default function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        localStorage.setItem("votivia_admin", "1");
        localStorage.setItem("votivia_admin_pass", password);
        onSuccess();
      } else {
        setError("Contraseña incorrecta.");
      }
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm border-[3px] border-black bg-surface p-6"
      >
        <h1 className="text-xl font-black text-foreground mb-6 font-sans font-bold uppercase text-center">
          Admin
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full bg-background border-[3px] border-black px-3 py-2 text-foreground placeholder:text-muted focus:outline-none font-sans font-bold mb-4"
          id="admin-password"
        />

        {error && (
          <p className="text-sm text-red-500 font-sans font-bold mb-4">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-surface rounded-xl border-[3px] border-black py-2 font-bold text-foreground uppercase hover:bg-foreground hover:text-background disabled:opacity-40"
          id="admin-login-btn"
        >
          {loading ? "..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
