"use client";

import React, { useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent } from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { useTRPC } from "@/trpc/client";
import { AuditEventTable } from "@/components/audit/AuditEventTable";

type Filters = { actor: string; actionPrefix: string; targetType: string; targetId: string; from: string; to: string };
const EMPTY: Filters = { actor: "", actionPrefix: "", targetType: "", targetId: "", from: "", to: "" };

/** Only filled fields; dates cover whole days. */
function toInput(filters: Filters) {
  return {
    ...(filters.actor ? { actor: filters.actor } : {}),
    ...(filters.actionPrefix ? { actionPrefix: filters.actionPrefix } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(filters.targetId ? { targetId: filters.targetId } : {}),
    ...(filters.from ? { from: new Date(`${filters.from}T00:00:00`) } : {}),
    ...(filters.to ? { to: new Date(`${filters.to}T23:59:59.999`) } : {}),
  };
}

const FIELDS: Array<{ key: keyof Filters; label: string; placeholder?: string; type?: string }> = [
  { key: "actor", label: "Actor", placeholder: "Email or user id" },
  { key: "actionPrefix", label: "Action", placeholder: "e.g. org. or user.role_changed" },
  { key: "targetType", label: "Target type", placeholder: "e.g. user" },
  { key: "targetId", label: "Target id" },
  { key: "from", label: "From", type: "date" },
  { key: "to", label: "To", type: "date" },
];

export default function AuditLogPage() {
  const { isPending, isAdmin } = useAdminGuard();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [exporting, setExporting] = useState(false);

  const events = useInfiniteQuery(
    trpc.audit.list.infiniteQueryOptions(
      { ...toInput(applied), limit: 50 },
      { enabled: isAdmin, getNextPageParam: (page) => page.nextCursor ?? undefined },
    ),
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { csv, truncated } = await queryClient.fetchQuery(trpc.audit.exportCsv.queryOptions(toInput(applied)));
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (truncated) toast.warning("Export holds the newest 10,000 events; narrow the filters for the rest.");
    } catch (error) {
      toast.error((error as Error).message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (isPending || !isAdmin) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const items = events.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Audit log</h1>
          <p className="mt-2 text-muted-foreground">Who changed what, and when. Events cannot be edited or deleted.</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              setApplied(draft);
            }}
          >
            {FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`audit-${field.key}`}>{field.label}</Label>
                <Input
                  id={`audit-${field.key}`}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={draft[field.key]}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit">Apply</Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDraft(EMPTY);
                  setApplied(EMPTY);
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {events.isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <AuditEventTable events={items} />
      )}

      {events.hasNextPage ? (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => events.fetchNextPage()} disabled={events.isFetchingNextPage}>
            {events.isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
