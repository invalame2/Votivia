"use client";

import { useState, useEffect, useRef } from "react";
import { getUserUUID } from "@/lib/uuid";

interface Notification {
  id: string;
  suggestion_id: string;
  type: string;
  message: string;
  created_at: string;
}

interface Props {
  onNotificationClick: (suggestionId: string) => void;
}

export default function NotificationBell({ onNotificationClick }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load read ids from local storage
    const stored = localStorage.getItem("votivia_read_notifications");
    if (stored) {
      try {
        setReadIds(new Set(JSON.parse(stored)));
      } catch {}
    }

    const fetchNotifications = async () => {
      const uuid = getUserUUID();
      try {
        const res = await fetch(`/api/notifications?uuid=${uuid}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch {}
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Click outside to close
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Mark all current as read
      const newReadIds = new Set(readIds);
      notifications.forEach((n) => newReadIds.add(n.id));
      setReadIds(newReadIds);
      localStorage.setItem("votivia_read_notifications", JSON.stringify(Array.from(newReadIds)));
    }
  };

  const handleItemClick = (suggestionId: string) => {
    setIsOpen(false);
    onNotificationClick(suggestionId);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className="bg-background border-[2px] border-black p-2 rounded hover:bg-surface-hover transition-colors relative"
        aria-label="Notificaciones"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 sm:w-80 bg-surface border-[3px] border-black rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-96">
          <div className="bg-background border-b-[2px] border-black p-3">
            <h3 className="font-black text-sm uppercase">Notificaciones</h3>
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm font-bold text-muted">No tienes notificaciones.</div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n.suggestion_id)}
                  className="w-full text-left p-3 border-b border-black/20 hover:bg-background transition-colors flex flex-col gap-1 last:border-b-0"
                >
                  <span className="text-sm font-bold text-foreground">{n.message}</span>
                  <span className="text-xs font-bold text-muted">
                    {new Date(n.created_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
