import { getUserUUID } from "./uuid";

export interface UserProfile {
  uuid: string;
  username: string;
  tag: string;
  color: string;
}

const PROFILE_KEY = "votivia_profile_cache";

const COLORS = [
  // Blues
  "#3b82f6", "#0ea5e9", "#0284c7", "#60a5fa", "#38bdf8",
  // Greens
  "#22c55e", "#16a34a", "#10b981", "#34d399", "#14b8a6",
  // Purples
  "#8b5cf6", "#a855f7", "#c084fc", "#d8b4fe", "#e879f9",
  // Reds/Pinks
  "#ef4444", "#f43f5e", "#f472b6", "#fb7185", "#ec4899",
  // Oranges/Ambers
  "#f97316", "#fb923c", "#f59e0b", "#fbbf24", "#fcd34d",
  // Teals/Cyan
  "#06b6d4", "#2dd4bf", "#67e8f9",
  // Indigo
  "#6366f1", "#818cf8",
  // Lime/emerald
  "#84cc16", "#a3e635",
];

export async function ensureProfile(): Promise<UserProfile | null> {
  if (typeof window === "undefined") return null;

  const cached = localStorage.getItem(PROFILE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached) as UserProfile;
    } catch {}
  }

  const uuid = getUserUUID();
  try {
    const res = await fetch("/api/profiles/ensure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uuid }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.profile) {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
        return data.profile;
      }
    }
  } catch {
    // Silently fail
  }
  return null;
}
