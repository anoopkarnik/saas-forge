"use client";

import React, { useState } from "react";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Checkbox } from "@workspace/ui/components/shadcn/checkbox";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { SecretDialog } from "@workspace/ui/components/webhooks/SecretDialog";

export type WebhookScope =
  | "personal"
  // scaffold:begin multi_tenancy
  | "organization";
// scaffold:end multi_tenancy

export type WebhookEndpointItem = {
  id: string;
  url: string;
  secretPrefix: string;
  enabled: boolean;
  description: string | null;
  disabledReason: string | null;
  events: string[];
};

export type CreateWebhookInput = {
  url: string;
  description: string;
  events: string[];
};

export type WebhooksPanelProps = {
  scope: WebhookScope;
  onScopeChange: (scope: WebhookScope) => void;
  endpoints: WebhookEndpointItem[];
  eventTypes: { type: string; description: string }[];
  error?: string;
  readOnly: boolean;
  isCreating: boolean;
  /** Call onCreated as soon as the mutation succeeds, before showing a secret or refreshing. */
  onCreate: (
    input: CreateWebhookInput,
    onCreated: () => void,
  ) => Promise<unknown>;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onRotateSecret: (id: string) => void;
  onSendTest: (id: string) => void;
  renderDeliveries: (endpointId: string) => React.ReactNode;
  secret: string | null;
  onSecretClose: () => void;
};

/** Endpoint management and delivery disclosure; the host supplies all remote actions. */
export function WebhooksPanel({
  scope,
  onScopeChange,
  endpoints,
  eventTypes,
  error,
  readOnly,
  isCreating,
  onCreate,
  onToggle,
  onDelete,
  onRotateSecret,
  onSendTest,
  renderDeliveries,
  secret,
  onSecretClose,
}: WebhooksPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [openEndpoint, setOpenEndpoint] = useState<string | null>(null);

  async function create() {
    setIsSubmitting(true);
    try {
      await onCreate({ url, description, events }, () => {
        setUrl("");
        setDescription("");
        setEvents([]);
      });
    } catch {
      // The host reports mutation errors; preserve the input for another attempt.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Webhooks</h2>
        <p className="text-sm text-muted-foreground">
          We POST signed JSON events to your endpoints and retry failures for
          about 24 hours.
        </p>
      </div>

      {/* scaffold:begin multi_tenancy */}
      <div className="inline-flex w-fit rounded-md border p-1">
        {(["personal", "organization"] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={scope === value ? "default" : "ghost"}
            onClick={() => onScopeChange(value)}
          >
            {value === "personal" ? "Personal" : "Workspace"}
          </Button>
        ))}
      </div>
      {/* scaffold:end multi_tenancy */}

      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}

      <ul className="flex flex-col gap-3">
        {endpoints.map((endpoint) => (
          <li
            key={endpoint.id}
            className="flex flex-col gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="break-all font-mono text-sm">
                {endpoint.url}
              </span>
              <Badge variant="outline">{endpoint.secretPrefix}…</Badge>
              <Switch
                className="ml-auto"
                checked={endpoint.enabled}
                disabled={readOnly}
                onCheckedChange={(enabled) => onToggle(endpoint.id, enabled)}
                aria-label="Enabled"
              />
            </div>
            {endpoint.description ? (
              <p className="text-sm text-muted-foreground">
                {endpoint.description}
              </p>
            ) : null}
            {endpoint.disabledReason ? (
              <p className="text-sm text-destructive">
                {endpoint.disabledReason}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {endpoint.events.join(", ")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() => onSendTest(endpoint.id)}
              >
                Send test event
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={readOnly}
                onClick={() => onRotateSecret(endpoint.id)}
              >
                Rotate secret
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setOpenEndpoint(
                    openEndpoint === endpoint.id ? null : endpoint.id,
                  )
                }
              >
                {openEndpoint === endpoint.id
                  ? "Hide deliveries"
                  : "Deliveries"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                disabled={readOnly}
                onClick={() => onDelete(endpoint.id)}
              >
                Delete
              </Button>
            </div>
            {openEndpoint === endpoint.id
              ? renderDeliveries(endpoint.id)
              : null}
          </li>
        ))}
      </ul>

      {!readOnly ? (
        <form
          className="flex flex-col gap-3 rounded-lg border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <h3 className="text-sm font-semibold">Add an endpoint</h3>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook-url">URL</Label>
            <Input
              id="webhook-url"
              placeholder="https://example.com/webhooks"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="webhook-description">Description</Label>
            <Input
              id="webhook-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Events</legend>
            {eventTypes.map((event) => (
              <label
                key={event.type}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={events.includes(event.type)}
                  onCheckedChange={(checked) =>
                    setEvents((current) =>
                      checked
                        ? [...current, event.type]
                        : current.filter((type) => type !== event.type),
                    )
                  }
                />
                <span className="font-mono">{event.type}</span>
                <span className="text-muted-foreground">
                  {event.description}
                </span>
              </label>
            ))}
          </fieldset>
          <Button
            type="submit"
            className="w-fit"
            disabled={!url || events.length === 0 || isCreating || isSubmitting}
          >
            {isCreating || isSubmitting ? "Adding…" : "Add endpoint"}
          </Button>
        </form>
      ) : null}

      <SecretDialog secret={secret} onClose={onSecretClose} />
    </div>
  );
}
