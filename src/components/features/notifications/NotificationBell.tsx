"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useListNotificationsQuery, useMarkAsReadMutation } from "@/store/api/notificationsApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: notifications = [] } = useListNotificationsQuery(undefined, {
    pollingInterval: 30000,
  });
  const [markAsRead] = useMarkAsReadMutation();

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const recent = notifications.slice(0, 5);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="relative"
      >
        <Bell />
        {unreadCount > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
            tabIndex={-1}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-zinc-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
              <span className="text-sm font-semibold text-zinc-900">Notifications</span>
              <Link
                href="/notifications"
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {recent.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet</p>
              ) : (
                <ul>
                  {recent.map((notification) => (
                    <li
                      key={notification.id}
                      className={cn(
                        "border-b border-zinc-100 px-4 py-3 last:border-b-0",
                        !notification.read_at && "bg-zinc-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{notification.title}</p>
                          <p className="text-sm text-zinc-600">{notification.message}</p>
                        </div>
                        {!notification.read_at && (
                          <button
                            type="button"
                            className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
