"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ListItem = {
  id: string;
  label: string;
  keyPrefix: string;
  scopes: string[];
  status: "active" | "revoked";
  lastUsedAt: Date | string | null;
  expiresAt: Date | string | null;
  createdAt: Date | string;
};

export function ApiKeyList({ onCreateClick }: { onCreateClick: () => void }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const list = useQuery(trpc.apiKey.list.queryOptions());
  const [busyId, setBusyId] = useState<string | null>(null);

  const revoke = useMutation(
    trpc.apiKey.revoke.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: trpc.apiKey.list.queryKey() });
      },
    }),
  );

  if (list.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (list.error) return <p className="text-sm text-destructive">{list.error.message}</p>;

  const rows = (list.data ?? []) as ListItem[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">API Keys</h1>
          <p className="text-sm text-muted-foreground">
            Create scoped keys for programmatic access. Keys are shown once at creation.
          </p>
        </div>
        <Button onClick={onCreateClick}>Create key</Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          You don't have any API keys yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.label}</span>
                  <Badge variant={row.status === "active" ? "default" : "secondary"}>
                    {row.status}
                  </Badge>
                </div>
                <code className="text-xs text-muted-foreground">{row.keyPrefix}…</code>
                <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                  {row.scopes.map((s) => (
                    <span key={s} className="rounded bg-muted px-1.5 py-0.5">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last used: {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "never"}
                </p>
              </div>
              {row.status === "active" && (
                <Button
                  variant="destructive"
                  disabled={busyId === row.id || revoke.isPending}
                  onClick={async () => {
                    setBusyId(row.id);
                    try {
                      await revoke.mutateAsync({ id: row.id });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  Revoke
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
