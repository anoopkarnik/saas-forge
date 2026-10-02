"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useSession } from "@workspace/auth/better-auth/auth-client";
import { TeamSettings } from "@workspace/ui/components/organizations/TeamSettings";

export function TeamSettingsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: session } = useSession();
  const { data, isLoading, error } = useQuery(trpc.organization.members.queryOptions());

  const refreshTeam = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.organization.members.queryKey() }),
      queryClient.invalidateQueries({ queryKey: trpc.organization.current.queryKey() }),
    ]);
  const onError = (err: { message: string }) => toast.error(err.message);
  const withToast = (message: string) => async () => {
    toast.success(message);
    await refreshTeam();
  };
  const leaveWorkspace = (message: string) => async () => {
    toast.success(message);
    await queryClient.invalidateQueries();
    router.push("/");
  };

  const rename = useMutation(trpc.organization.update.mutationOptions({ onSuccess: withToast("Workspace renamed"), onError }));
  const invite = useMutation(trpc.organization.invite.mutationOptions({ onSuccess: withToast("Invitation sent"), onError }));
  const cancelInvitation = useMutation(trpc.organization.cancelInvitation.mutationOptions({ onSuccess: withToast("Invitation revoked"), onError }));
  const changeRole = useMutation(trpc.organization.updateMemberRole.mutationOptions({ onSuccess: withToast("Role updated"), onError }));
  const remove = useMutation(trpc.organization.removeMember.mutationOptions({ onSuccess: withToast("Member removed"), onError }));
  const leave = useMutation(trpc.organization.leave.mutationOptions({ onSuccess: leaveWorkspace("You left the workspace"), onError }));
  const destroy = useMutation(trpc.organization.delete.mutationOptions({ onSuccess: leaveWorkspace("Workspace deleted"), onError }));

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading team…</p>;
  }
  if (error || !data?.organization) {
    return (
      <p className="text-sm text-muted-foreground">
        {error?.message ?? "Select a workspace from the sidebar to manage its team."}
      </p>
    );
  }

  const isBusy = [rename, invite, cancelInvitation, changeRole, remove, leave, destroy].some(
    (mutation) => mutation.isPending,
  );

  return (
    <TeamSettings
      organization={data.organization}
      currentRole={data.role}
      currentUserId={session?.user?.id ?? ""}
      members={data.members}
      invitations={data.invitations}
      onRename={(name) => rename.mutate({ name })}
      onInvite={(input) => invite.mutate(input)}
      onCancelInvitation={(invitationId) => cancelInvitation.mutate({ invitationId })}
      onChangeRole={(memberId, role) => changeRole.mutate({ memberId, role })}
      onRemove={(memberId) => remove.mutate({ memberId })}
      onLeave={() => leave.mutate()}
      onDelete={() => destroy.mutate()}
      isBusy={isBusy}
    />
  );
}

export default TeamSettingsPanel;
