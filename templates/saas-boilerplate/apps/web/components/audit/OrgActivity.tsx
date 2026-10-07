"use client";

import React from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useTRPC } from "@/trpc/client";
import { AuditEventTable } from "@/components/audit/AuditEventTable";

/** The active workspace's audit trail, for its admins and owners; others see nothing. */
export function OrgActivity() {
  const trpc = useTRPC();
  const events = useInfiniteQuery(
    trpc.audit.orgActivity.infiniteQueryOptions(
      { limit: 20 },
      { retry: false, getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  );

  if (events.isLoading || events.error) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Activity</h2>
        <p className="text-sm text-muted-foreground">Changes to this workspace, newest first.</p>
      </div>
      <AuditEventTable events={events.data?.pages.flatMap((page) => page.items) ?? []} showIp={false} />
      {events.hasNextPage ? (
        <Button variant="outline" size="sm" onClick={() => events.fetchNextPage()} disabled={events.isFetchingNextPage}>
          Load more
        </Button>
      ) : null}
    </section>
  );
}

export default OrgActivity;
