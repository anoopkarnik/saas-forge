"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Checkbox } from "@workspace/ui/components/shadcn/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { useTRPC } from "@/trpc/client";

type Scope =
  | "personal"
  // scaffold:begin multi_tenancy
  | "organization"
  // scaffold:end multi_tenancy
  ;

/** Shows a new signing secret once. */
function SecretDialog({ secret, onClose }: { secret: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!secret} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Signing secret</DialogTitle>
          <DialogDescription>
            Copy it now; it will not be shown again. Verify each request&apos;s SaaSForge-Signature header with it.
          </DialogDescription>
        </DialogHeader>
        <code className="break-all rounded-md bg-muted p-3 text-sm">{secret}</code>
        <DialogFooter>
          <Button variant="outline" onClick={() => secret && navigator.clipboard.writeText(secret).then(() => toast.success("Copied"))}>
            Copy
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Deliveries({ scope, endpointId, readOnly }: { scope: Scope; endpointId: string; readOnly: boolean }) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deliveries = useQuery(trpc.webhook.deliveries.queryOptions({ scope, endpointId }));
  const replay = useMutation(
    trpc.webhook.replay.mutationOptions({
      onSuccess: () => {
        toast.success("Delivery queued again");
        return queryClient.invalidateQueries({ queryKey: trpc.webhook.deliveries.queryKey() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (deliveries.isLoading) return <p className="text-xs text-muted-foreground">Loading deliveries…</p>;
  const items = deliveries.data?.items ?? [];
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No deliveries yet.</p>;
  return (
    <ul className="flex flex-col divide-y rounded-md border text-xs">
      {items.map((delivery) => (
        <li key={delivery.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
          <Badge variant={delivery.status === "succeeded" ? "default" : delivery.status === "failed" ? "destructive" : "secondary"}>
            {delivery.status}
          </Badge>
          <span className="font-mono">{delivery.eventType}</span>
          <span className="text-muted-foreground">
            {delivery.responseCode ?? "—"} · attempt {delivery.attempt} · {new Date(delivery.createdAt).toLocaleString()}
          </span>
          {delivery.error ? <span className="text-destructive">{delivery.error}</span> : null}
          {!readOnly ? (
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={() => replay.mutate({ scope, deliveryId: delivery.id })}>
              Replay
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Settings → Webhooks (webhooks module): endpoints, secrets, test events and the delivery log. */
export function WebhooksScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const readOnly = session?.user?.role === "guest";
  const [scope, setScope] = useState<Scope>("personal");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [openEndpoint, setOpenEndpoint] = useState<string | null>(null);

  const eventTypes = useQuery(trpc.webhook.eventTypes.queryOptions());
  const endpoints = useQuery(trpc.webhook.list.queryOptions({ scope }));
  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.webhook.list.queryKey() });
  const onError = (error: { message: string }) => toast.error(error.message);

  const create = useMutation(
    trpc.webhook.create.mutationOptions({
      onSuccess: async (result) => {
        setSecret(result.secret);
        setUrl("");
        setDescription("");
        setEvents([]);
        await refresh();
      },
      onError,
    }),
  );
  const update = useMutation(trpc.webhook.update.mutationOptions({ onSuccess: refresh, onError }));
  const remove = useMutation(trpc.webhook.delete.mutationOptions({ onSuccess: refresh, onError }));
  const rotate = useMutation(trpc.webhook.rotateSecret.mutationOptions({ onSuccess: (result) => setSecret(result.secret), onError }));
  const sendTest = useMutation(
    trpc.webhook.sendTest.mutationOptions({
      onSuccess: () => {
        toast.success("Test event queued");
        return queryClient.invalidateQueries({ queryKey: trpc.webhook.deliveries.queryKey() });
      },
      onError,
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Webhooks</h2>
        <p className="text-sm text-muted-foreground">
          We POST signed JSON events to your endpoints and retry failures for about 24 hours.
        </p>
      </div>

      {/* scaffold:begin multi_tenancy */}
      <div className="inline-flex w-fit rounded-md border p-1">
        {(["personal", "organization"] as const).map((value) => (
          <Button key={value} size="sm" variant={scope === value ? "default" : "ghost"} onClick={() => setScope(value)}>
            {value === "personal" ? "Personal" : "Workspace"}
          </Button>
        ))}
      </div>
      {/* scaffold:end multi_tenancy */}

      {endpoints.error ? <p className="text-sm text-muted-foreground">{endpoints.error.message}</p> : null}

      <ul className="flex flex-col gap-3">
        {(endpoints.data ?? []).map((endpoint) => (
          <li key={endpoint.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-sm">{endpoint.url}</span>
              <Badge variant="outline">{endpoint.secretPrefix}…</Badge>
              <Switch
                className="ml-auto"
                checked={endpoint.enabled}
                disabled={readOnly}
                onCheckedChange={(enabled) => update.mutate({ scope, id: endpoint.id, enabled })}
                aria-label="Enabled"
              />
            </div>
            {endpoint.description ? <p className="text-sm text-muted-foreground">{endpoint.description}</p> : null}
            {endpoint.disabledReason ? <p className="text-sm text-destructive">{endpoint.disabledReason}</p> : null}
            <p className="text-xs text-muted-foreground">{endpoint.events.join(", ")}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={readOnly} onClick={() => sendTest.mutate({ scope, id: endpoint.id })}>
                Send test event
              </Button>
              <Button size="sm" variant="outline" disabled={readOnly} onClick={() => rotate.mutate({ scope, id: endpoint.id })}>
                Rotate secret
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpenEndpoint(openEndpoint === endpoint.id ? null : endpoint.id)}>
                {openEndpoint === endpoint.id ? "Hide deliveries" : "Deliveries"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={readOnly}
                onClick={() => remove.mutate({ scope, id: endpoint.id })}
              >
                Delete
              </Button>
            </div>
            {openEndpoint === endpoint.id ? <Deliveries scope={scope} endpointId={endpoint.id} readOnly={readOnly} /> : null}
          </li>
        ))}
      </ul>

      {!readOnly ? (
        <form
          className="flex flex-col gap-3 rounded-lg border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            create.mutate({ scope, url, description, events });
          }}
        >
          <h3 className="text-sm font-semibold">Add an endpoint</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook-url">URL</Label>
            <Input id="webhook-url" placeholder="https://example.com/webhooks" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook-description">Description</Label>
            <Input id="webhook-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Events</legend>
            {(eventTypes.data ?? []).map((event) => (
              <label key={event.type} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={events.includes(event.type)}
                  onCheckedChange={(checked) =>
                    setEvents((current) => (checked ? [...current, event.type] : current.filter((type) => type !== event.type)))
                  }
                />
                <span className="font-mono">{event.type}</span>
                <span className="text-muted-foreground">{event.description}</span>
              </label>
            ))}
          </fieldset>
          <Button type="submit" className="w-fit" disabled={!url || events.length === 0 || create.isPending}>
            {create.isPending ? "Adding…" : "Add endpoint"}
          </Button>
        </form>
      ) : null}

      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </div>
  );
}
