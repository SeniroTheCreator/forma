"use client";

import { useListNotificationsQuery, useMarkAsReadMutation } from "@/store/api/notificationsApi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useListNotificationsQuery();
  const [markAsRead, { isLoading: isMarking }] = useMarkAsReadMutation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Notifications</h1>
        <p className="text-sm text-muted-foreground">All notifications sent to your account.</p>
      </div>

      <Card>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading notifications...</p>
          ) : notifications.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">You have no notifications yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={cn("flex items-start justify-between gap-4 py-4", !notification.read_at && "bg-zinc-50")}
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-900">{notification.title}</p>
                    <p className="text-sm text-zinc-600">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.read_at ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isMarking}
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark read
                    </Button>
                  ) : (
                    <span className="shrink-0 text-xs text-muted-foreground">Read</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
