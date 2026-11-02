"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import {
  WebhooksPanel,
  type WebhookScope as Scope,
} from "@workspace/ui/blocks/webhooks/WebhooksPanel";
import { WebhookDeliveries } from "@workspace/ui/components/webhooks/WebhookDeliveries";
import { useTRPC } from "@/trpc/client";

function Deliveries({
  scope,
  endpointId,
  readOnly,
}: {
  scope: Scope;
  endpointId: string;
  readOnly: boolean;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deliveries = useQuery(
    trpc.webhook.deliveries.queryOptions({ scope, endpointId }),
  );
  const replay = useMutation(
    trpc.webhook.replay.mutationOptions({
      onSuccess: () => {
        toast.success("Delivery queued again");
        return queryClient.invalidateQueries({
          queryKey: trpc.webhook.deliveries.queryKey(),
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <WebhookDeliveries
      items={deliveries.data?.items ?? []}
      isLoading={deliveries.isLoading}
      readOnly={readOnly}
      onReplay={(deliveryId) => replay.mutate({ scope, deliveryId })}
    />
  );
}

/** Settings → Webhooks (webhooks module): endpoints, secrets, test events and the delivery log. */
export function WebhooksScreen() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const readOnly = session?.user?.role === "guest";
  const [scope, setScope] = useState<Scope>("personal");
  const [secret, setSecret] = useState<string | null>(null);

  const eventTypes = useQuery(trpc.webhook.eventTypes.queryOptions());
  const endpoints = useQuery(trpc.webhook.list.queryOptions({ scope }));
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: trpc.webhook.list.queryKey() });
  const onError = (error: { message: string }) => toast.error(error.message);

  const create = useMutation(trpc.webhook.create.mutationOptions({ onError }));
  const update = useMutation(
    trpc.webhook.update.mutationOptions({ onSuccess: refresh, onError }),
  );
  const remove = useMutation(
    trpc.webhook.delete.mutationOptions({ onSuccess: refresh, onError }),
  );
  const rotate = useMutation(
    trpc.webhook.rotateSecret.mutationOptions({
      onSuccess: (result) => setSecret(result.secret),
      onError,
    }),
  );
  const sendTest = useMutation(
    trpc.webhook.sendTest.mutationOptions({
      onSuccess: () => {
        toast.success("Test event queued");
        return queryClient.invalidateQueries({
          queryKey: trpc.webhook.deliveries.queryKey(),
        });
      },
      onError,
    }),
  );

  return (
    <WebhooksPanel
      scope={scope}
      onScopeChange={setScope}
      endpoints={endpoints.data ?? []}
      eventTypes={eventTypes.data ?? []}
      error={endpoints.error?.message}
      readOnly={readOnly}
      isCreating={create.isPending}
      onCreate={async (input, onCreated) => {
        const result = await create.mutateAsync({ scope, ...input });
        onCreated();
        setSecret(result.secret);
        await refresh();
      }}
      onToggle={(id, enabled) => update.mutate({ scope, id, enabled })}
      onDelete={(id) => remove.mutate({ scope, id })}
      onRotateSecret={(id) => rotate.mutate({ scope, id })}
      onSendTest={(id) => sendTest.mutate({ scope, id })}
      renderDeliveries={(endpointId) => (
        <Deliveries scope={scope} endpointId={endpointId} readOnly={readOnly} />
      )}
      secret={secret}
      onSecretClose={() => setSecret(null)}
    />
  );
}
