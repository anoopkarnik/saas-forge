"use client";

import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useTRPC } from "@/trpc/client";

const formatDate = (value: Date | string | null) => (value ? new Date(value).toLocaleString() : "Never");

export default function JobsAdminPage() {
    const { isPending, isAdmin } = useAdminGuard();
    const trpc = useTRPC();
    const qc = useQueryClient();

    const failed = useQuery({ ...trpc.jobs.failed.queryOptions(), enabled: isAdmin });
    const schedules = useQuery({ ...trpc.jobs.schedules.queryOptions(), enabled: isAdmin });
    const refresh = () => qc.invalidateQueries({ queryKey: trpc.jobs.failed.queryKey() });

    const replay = useMutation(
        trpc.jobs.replay.mutationOptions({
            onSuccess: async () => {
                await refresh();
                toast.success("Job queued again");
            },
            onError: (error) => toast.error(error.message),
        }),
    );
    const discard = useMutation(
        trpc.jobs.discard.mutationOptions({
            onSuccess: async () => {
                await refresh();
                toast.success("Failed run discarded");
            },
            onError: (error) => toast.error(error.message),
        }),
    );

    if (isPending) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:px-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Background jobs</h1>
                <p className="mt-2 text-muted-foreground">
                    Jobs that failed every retry, and the cron schedules. Successful runs are in the Inngest dashboard.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Failed jobs</CardTitle>
                    <CardDescription>Replay queues the same payload again; discard hides it.</CardDescription>
                </CardHeader>
                <CardContent>
                    {failed.data?.length ? (
                        <ul className="flex flex-col gap-3 text-sm">
                            {failed.data.map((run) => (
                                <li key={run.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-medium">{run.name}</span>
                                            <Badge variant="outline">v{run.version}</Badge>
                                            <Badge variant="destructive">{run.attempts} attempts</Badge>
                                        </div>
                                        <p className="break-all text-muted-foreground">{run.lastError}</p>
                                        <p className="text-xs text-muted-foreground">{formatDate(run.createdAt)}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" disabled={replay.isPending} onClick={() => replay.mutate({ id: run.id })}>
                                            Replay
                                        </Button>
                                        <Button size="sm" variant="outline" disabled={discard.isPending} onClick={() => discard.mutate({ id: run.id })}>
                                            Discard
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">{failed.isLoading ? "Loading…" : "No failed jobs."}</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Schedules</CardTitle>
                    <CardDescription>Cron expressions run in UTC. Each window fires once, even if triggered twice.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="flex flex-col gap-2 text-sm">
                        {(schedules.data ?? []).map((schedule) => (
                            <li key={schedule.name} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                                <div className="flex flex-col">
                                    <span className="font-medium">{schedule.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        <code>{schedule.cron}</code> → {schedule.job}
                                    </span>
                                </div>
                                <span className="text-xs text-muted-foreground">Last run: {formatDate(schedule.lastFiredAt)}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
