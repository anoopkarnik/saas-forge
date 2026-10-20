"use client";
import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { WorkspaceSwitcher } from "@workspace/ui/components/organizations/WorkspaceSwitcher";

// Workspace switcher slot (multi_tenancy module). AppSidebar renders this
// unconditionally; scaffolds without the module get a stub that renders null.
export function WorkspaceSlot() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data } = useQuery(trpc.organization.current.queryOptions());

  const refreshAll = async () => {
    await queryClient.invalidateQueries();
    router.refresh();
  };
  const onError = (error: { message: string }) => toast.error(error.message);

  const setActive = useMutation(
    trpc.organization.setActive.mutationOptions({ onSuccess: refreshAll, onError }),
  );
  // Silent variant used to repair a session with no (or a stale) active org.
  const autoSelect = useMutation(
    trpc.organization.setActive.mutationOptions({ onSuccess: refreshAll }),
  );
  const create = useMutation(
    trpc.organization.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Workspace created");
        await refreshAll();
      },
      onError,
    }),
  );
  const accept = useMutation(
    trpc.organization.acceptInvitation.mutationOptions({
      onSuccess: async () => {
        toast.success("You joined the workspace");
        await refreshAll();
      },
      onError,
    }),
  );
  const decline = useMutation(
    trpc.organization.rejectInvitation.mutationOptions({
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: trpc.organization.current.queryKey() }),
      onError,
    }),
  );

  const attemptedAutoSelect = useRef(false);
  useEffect(() => {
    const first = data?.organizations[0];
    if (data && !data.active && first && !attemptedAutoSelect.current) {
      attemptedAutoSelect.current = true;
      autoSelect.mutate({ organizationId: first.id });
    }
  }, [data, autoSelect]);

  if (!data) return null;

  return (
    <WorkspaceSwitcher
      organizations={data.organizations}
      activeId={data.active?.id ?? null}
      invitations={data.invitations}
      onSwitch={(organizationId) => setActive.mutate({ organizationId })}
      onCreate={async (name) => {
        await create.mutateAsync({ name });
      }}
      onManage={() => router.push("/organization")}
      onAcceptInvitation={(invitationId) => accept.mutate({ invitationId })}
      onDeclineInvitation={(invitationId) => decline.mutate({ invitationId })}
      isBusy={setActive.isPending || create.isPending || accept.isPending || decline.isPending}
    />
  );
}

export default WorkspaceSlot;
