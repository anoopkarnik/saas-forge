"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { NotificationBell } from "@workspace/ui/components/notifications/NotificationBell";
import { useTRPC } from "@/trpc/client";

/** The web bell: polls the unread count every 30 s and when the window regains focus. */
export function NotificationsBell() {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const unread = useQuery({
    ...trpc.notification.unreadCount.queryOptions(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const list = useQuery({ ...trpc.notification.list.queryOptions({ limit: 20 }), enabled: open });
  const preferences = useQuery({ ...trpc.notification.preferences.get.queryOptions(), enabled: open });

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: trpc.notification.unreadCount.queryKey() }),
      qc.invalidateQueries({ queryKey: trpc.notification.list.queryKey() }),
    ]);
  const markRead = useMutation(trpc.notification.markRead.mutationOptions({ onSuccess: refresh }));
  const markAllRead = useMutation(trpc.notification.markAllRead.mutationOptions({ onSuccess: refresh }));
  const setPreference = useMutation(
    trpc.notification.preferences.set.mutationOptions({
      onSuccess: () => qc.invalidateQueries({ queryKey: trpc.notification.preferences.get.queryKey() }),
    }),
  );

  // Guests may read their inbox; marking read is a write they are not allowed.
  const readOnly = session?.user?.role === "guest";

  return (
    <NotificationBell
      unreadCount={unread.data ?? 0}
      items={list.data ?? []}
      loading={list.isLoading}
      readOnly={readOnly}
      preferences={preferences.data}
      onOpenChange={setOpen}
      onSelect={(item) => {
        if (!item.readAt && !readOnly) markRead.mutate({ id: item.id });
        if (item.link) router.push(item.link);
      }}
      onMarkAllRead={() => markAllRead.mutate()}
      onTogglePreference={(type, channel, enabled) =>
        setPreference.mutate({ type, channel: channel as "in_app" | "email", enabled })
      }
    />
  );
}
