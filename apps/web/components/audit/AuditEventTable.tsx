"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/shadcn/table";

export type AuditEventItem = {
  id: string;
  occurredAt: Date | string;
  action: string;
  actorType: string;
  actorEmail: string | null;
  actorUserId: string | null;
  targetType: string;
  targetId: string | null;
  metadata: unknown;
  ip: string | null;
};

function actorLabel(event: AuditEventItem): string {
  if (event.actorType === "system") return "System";
  const who = event.actorEmail ?? event.actorUserId ?? "unknown";
  return event.actorType === "apiKey" ? `${who} (API key)` : who;
}

function metadataLabel(metadata: unknown): string {
  if (!metadata || typeof metadata !== "object" || Object.keys(metadata).length === 0) return "";
  return JSON.stringify(metadata);
}

/** The audit trail as a table (audit_log module): admin viewer and organization activity. */
export function AuditEventTable({ events, showIp = true }: { events: AuditEventItem[]; showIp?: boolean }) {
  if (events.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No events.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Details</TableHead>
          {showIp ? <TableHead>IP</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="whitespace-nowrap text-xs">{new Date(event.occurredAt).toLocaleString()}</TableCell>
            <TableCell className="font-mono text-xs">{event.action}</TableCell>
            <TableCell className="text-xs">{actorLabel(event)}</TableCell>
            <TableCell className="text-xs">
              {event.targetType}
              {event.targetId ? <span className="block font-mono text-muted-foreground">{event.targetId}</span> : null}
            </TableCell>
            <TableCell className="max-w-xs truncate font-mono text-xs" title={metadataLabel(event.metadata)}>
              {metadataLabel(event.metadata)}
            </TableCell>
            {showIp ? <TableCell className="text-xs">{event.ip ?? ""}</TableCell> : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
