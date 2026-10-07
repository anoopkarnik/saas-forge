"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/shadcn/popover";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { cn } from "@workspace/ui/lib/utils";

export type NotificationBellItem = {
  id: string;
  title: string;
  body: string;
  link?: string | null;
  readAt: Date | string | null;
  createdAt: Date | string;
};

export type NotificationBellPreference = {
  type: string;
  label: string;
  channels: Record<string, boolean>;
};

const CHANNEL_LABELS: Record<string, string> = { in_app: "In app", email: "Email" };

/**
 * The notification bell and inbox (notifications module). Presentational: the
 * app passes the data and the handlers. `readOnly` (guests) hides the write controls.
 */
export function NotificationBell({
  unreadCount,
  items,
  loading = false,
  readOnly = false,
  preferences,
  onOpenChange,
  onSelect,
  onMarkAllRead,
  onTogglePreference,
}: {
  unreadCount: number;
  items: NotificationBellItem[];
  loading?: boolean;
  readOnly?: boolean;
  preferences?: NotificationBellPreference[];
  onOpenChange?: (open: boolean) => void;
  onSelect?: (item: NotificationBellItem) => void;
  onMarkAllRead?: () => void;
  onTogglePreference?: (type: string, channel: string, enabled: boolean) => void;
}) {
  const [view, setView] = React.useState<"inbox" | "settings">("inbox");

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${unreadCount} unread)`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{view === "inbox" ? "Notifications" : "Notification settings"}</span>
          <div className="flex gap-1">
            {view === "inbox" && !readOnly && unreadCount > 0 ? (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onMarkAllRead}>
                Mark all read
              </Button>
            ) : null}
            {preferences && !readOnly ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setView(view === "inbox" ? "settings" : "inbox")}
              >
                {view === "inbox" ? "Settings" : "Back"}
              </Button>
            ) : null}
          </div>
        </div>

        {view === "inbox" ? (
          <ul className="max-h-96 overflow-auto">
            {items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                {loading ? "Loading…" : "You're all caught up."}
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left text-sm hover:bg-muted/50",
                      !item.readAt && "bg-muted/30",
                    )}
                    onClick={() => onSelect?.(item)}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {!item.readAt ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                      {item.title}
                    </span>
                    <span className="text-muted-foreground">{item.body}</span>
                    <span className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : (
          <ul className="flex max-h-96 flex-col gap-3 overflow-auto p-3 text-sm">
            {(preferences ?? []).map((preference) => (
              <li key={preference.type} className="flex flex-col gap-1">
                <span className="font-medium">{preference.label}</span>
                {Object.entries(preference.channels).map(([channel, enabled]) => (
                  <label key={channel} className="flex items-center justify-between text-muted-foreground">
                    {CHANNEL_LABELS[channel] ?? channel}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => onTogglePreference?.(preference.type, channel, checked)}
                    />
                  </label>
                ))}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
