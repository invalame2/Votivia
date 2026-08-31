const COOLDOWN_KEY = "votivia_last_post";
const POSTED_KEY = "votivia_posted_texts";
const COOLDOWN_MS = 30_000; // 30 seconds
const MAX_CHARS = 280;

export function checkCooldown(): { ok: boolean; remainingMs: number } {
  if (typeof window === "undefined") return { ok: true, remainingMs: 0 };

  const last = localStorage.getItem(COOLDOWN_KEY);
  if (!last) return { ok: true, remainingMs: 0 };

  const elapsed = Date.now() - parseInt(last, 10);
  if (elapsed >= COOLDOWN_MS) return { ok: true, remainingMs: 0 };

  return { ok: false, remainingMs: COOLDOWN_MS - elapsed };
}

export function setCooldown(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
}

export function validateContent(text: string): { ok: boolean; error: string } {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { ok: false, error: "El contenido no puede estar vacío." };
  }

  if (trimmed.length > MAX_CHARS) {
    return {
      ok: false,
      error: `Máximo ${MAX_CHARS} caracteres. Tienes ${trimmed.length}.`,
    };
  }

  // Check for repeated words (same word 5+ times)
  const words = trimmed.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
    if (freq[w] >= 5) {
      return { ok: false, error: "Texto detectado como spam." };
    }
  }

  return { ok: true, error: "" };
}

export function checkDuplicate(text: string): boolean {
  if (typeof window === "undefined") return false;

  const posted = JSON.parse(localStorage.getItem(POSTED_KEY) || "[]") as string[];
  const normalized = text.trim().toLowerCase();
  return posted.includes(normalized);
}

export function markAsPosted(text: string): void {
  if (typeof window === "undefined") return;

  const posted = JSON.parse(localStorage.getItem(POSTED_KEY) || "[]") as string[];
  posted.push(text.trim().toLowerCase());
  // Keep only last 50
  if (posted.length > 50) posted.shift();
  localStorage.setItem(POSTED_KEY, JSON.stringify(posted));
}

export const MAX_CONTENT_LENGTH = MAX_CHARS;
