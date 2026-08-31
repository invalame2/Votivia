const UUID_KEY = "votivia_user_uuid";

export function getUserUUID(): string {
  if (typeof window === "undefined") return "";

  let uuid = localStorage.getItem(UUID_KEY);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(UUID_KEY, uuid);
  }
  return uuid;
}
