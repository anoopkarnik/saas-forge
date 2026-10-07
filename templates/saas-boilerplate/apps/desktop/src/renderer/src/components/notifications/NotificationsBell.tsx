import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import {
    NotificationBell,
    type NotificationBellItem,
    type NotificationBellPreference,
} from "@workspace/ui/components/notifications/NotificationBell";
import { useTRPC } from "../../lib/trpc";

/**
 * The desktop bell (notifications module): the same inbox as the web app,
 * polled every 30 s and on focus. Links are web paths, so selecting only marks read.
 */
export default function NotificationsBell() {
    // The desktop tRPC client is untyped (see lib/trpc).
    const api = useTRPC().notification as any;
    const qc = useQueryClient();
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);

    const unread = useQuery({ ...api.unreadCount.queryOptions(), refetchInterval: 30_000, refetchOnWindowFocus: true });
    const list = useQuery({ ...api.list.queryOptions({ limit: 20 }), enabled: open });
    const preferences = useQuery({ ...api.preferences.get.queryOptions(), enabled: open });

    const refresh = () =>
        Promise.all([
            qc.invalidateQueries({ queryKey: api.unreadCount.queryKey() }),
            qc.invalidateQueries({ queryKey: api.list.queryKey() }),
        ]);
    const markRead = useMutation<unknown, Error, { id: string }>(api.markRead.mutationOptions({ onSuccess: refresh }));
    const markAllRead = useMutation(api.markAllRead.mutationOptions({ onSuccess: refresh }));
    const setPreference = useMutation<unknown, Error, { type: string; channel: string; enabled: boolean }>(
        api.preferences.set.mutationOptions({
            onSuccess: () => qc.invalidateQueries({ queryKey: api.preferences.get.queryKey() }),
        }),
    );
    const readOnly = session?.user?.role === "guest";

    return (
        <NotificationBell
            unreadCount={(unread.data as number | undefined) ?? 0}
            items={(list.data as NotificationBellItem[] | undefined) ?? []}
            loading={list.isLoading}
            readOnly={readOnly}
            preferences={preferences.data as NotificationBellPreference[] | undefined}
            onOpenChange={setOpen}
            onSelect={(item) => {
                if (!item.readAt && !readOnly) markRead.mutate({ id: item.id });
            }}
            onMarkAllRead={() => markAllRead.mutate(undefined)}
            onTogglePreference={(type, channel, enabled) => setPreference.mutate({ type, channel, enabled })}
        />
    );
}
