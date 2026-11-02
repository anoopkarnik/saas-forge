"use client";

import React from "react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";

export type WebhookDeliveryItem = {
  id: string;
  status: string;
  eventType: string;
  responseCode: number | null;
  attempt: number;
  createdAt: Date | string;
  error: string | null;
};

export function WebhookDeliveries({
  items,
  isLoading,
  readOnly,
  onReplay,
}: {
  items: WebhookDeliveryItem[];
  isLoading: boolean;
  readOnly: boolean;
  onReplay: (deliveryId: string) => void;
}) {
  if (isLoading)
    return <p className="text-xs text-muted-foreground">Loading deliveries…</p>;
  if (items.length === 0)
    return <p className="text-xs text-muted-foreground">No deliveries yet.</p>;
  return (
    <ul className="flex flex-col divide-y rounded-md border text-xs">
      {items.map((delivery) => (
        <li
          key={delivery.id}
          className="flex flex-wrap items-center gap-2 px-3 py-2"
        >
          <Badge
            variant={
              delivery.status === "succeeded"
                ? "default"
                : delivery.status === "failed"
                  ? "destructive"
                  : "secondary"
            }
          >
            {delivery.status}
          </Badge>
          <span className="font-mono">{delivery.eventType}</span>
          <span className="text-muted-foreground">
            {delivery.responseCode ?? "—"} · attempt {delivery.attempt} ·{" "}
            {new Date(delivery.createdAt).toLocaleString()}
          </span>
          {delivery.error ? (
            <span className="text-destructive">{delivery.error}</span>
          ) : null}
          {!readOnly ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 text-xs"
              onClick={() => onReplay(delivery.id)}
            >
              Replay
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
