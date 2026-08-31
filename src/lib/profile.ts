import { getUserUUID } from "./uuid";

export interface UserProfile {
  uuid: string;
  username: string;
  tag: string;
  color: string;
}

const PROFILE_KEY = "votivia_profile_cache";

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
