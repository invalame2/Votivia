const POST_COOLDOWN_KEY = "votivia_last_post";
const COMMENT_COOLDOWN_KEY = "votivia_last_comment";
const POSTED_KEY = "votivia_posted_texts";
const BAN_KEY = "votivia_banned_until";
const HISTORY_KEY = "votivia_action_history";

const POST_COOLDOWN_MS = 15_000; // 15 seconds
const COMMENT_COOLDOWN_MS = 5_000; // 5 seconds
const MAX_CHARS = 600;
const BAN_DURATION_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

export function checkCooldown(type: "post" | "comment" = "post"): { ok: boolean; remainingMs: number } {
  if (typeof window === "undefined") return { ok: true, remainingMs: 0 };

  // Check ban
  const banUntil = localStorage.getItem(BAN_KEY);
  if (banUntil) {
    const banMs = parseInt(banUntil, 10);
    if (Date.now() < banMs) {
      return { ok: false, remainingMs: banMs - Date.now() };
    } else {
      localStorage.removeItem(BAN_KEY);
    }
  }

  const key = type === "post" ? POST_COOLDOWN_KEY : COMMENT_COOLDOWN_KEY;
  const ms = type === "post" ? POST_COOLDOWN_MS : COMMENT_COOLDOWN_MS;

  const last = localStorage.getItem(key);
  if (!last) return { ok: true, remainingMs: 0 };

  const elapsed = Date.now() - parseInt(last, 10);
  if (elapsed >= ms) return { ok: true, remainingMs: 0 };

  return { ok: false, remainingMs: ms - elapsed };
}

export function setCooldown(type: "post" | "comment" = "post"): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const key = type === "post" ? POST_COOLDOWN_KEY : COMMENT_COOLDOWN_KEY;
  localStorage.setItem(key, now.toString());

  // Track history for massive spam detection
  const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as number[];
  history.push(now);
  
  // Keep only last 5 actions
  if (history.length > 5) {
    history.shift();
  }
  
  // If we have 5 actions and the first one was less than 30 seconds ago -> massive spam ban!
  if (history.length === 5 && now - history[0] < 30_000) {
    localStorage.setItem(BAN_KEY, (now + BAN_DURATION_MS).toString());
    // Clear history to avoid immediate re-ban if they wait 4 days
    localStorage.setItem(HISTORY_KEY, "[]");
  } else {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
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

  // Check for repeated words (same word 15+ times instead of 5 to allow 'xd xd' but prevent huge spam walls)
  const words = trimmed.toLowerCase().split(/\s+/);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (w.length > 1) { // ignore single letters
      freq[w] = (freq[w] || 0) + 1;
      if (freq[w] >= 15) {
        return { ok: false, error: "Texto detectado como spam masivo." };
      }
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
