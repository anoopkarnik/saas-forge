import React, { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useSession } from "@workspace/auth/better-auth/auth-client"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@workspace/ui/components/shadcn/dialog"
import {
    WorkspaceSwitcher,
    type OrgSummary,
    type PendingInvitation,
} from "@workspace/ui/components/organizations/WorkspaceSwitcher"
import {
    TeamSettings,
    type TeamInvitation,
    type TeamMember,
} from "@workspace/ui/components/organizations/TeamSettings"
import { useTRPC } from "../../lib/trpc"

// The desktop tRPC client is untyped (see lib/trpc.ts), so the response shapes
// of organization.current / organization.members are declared here.
type CurrentWorkspaces = {
    active: OrgSummary | null
    organizations: OrgSummary[]
    invitations: PendingInvitation[]
}
type TeamData = {
    organization: { id: string; name: string; slug: string } | null
    role: string
    members: TeamMember[]
    invitations: TeamInvitation[]
}

const useOrgMutation = (options: unknown) => useMutation<unknown, Error, any>(options as any)

// Workspace switcher slot (multi_tenancy module). DashboardRoute passes this to
// the sidebar; scaffolds without the module get a stub that renders null.
export function WorkspaceSlot() {
    const trpc = useTRPC() as any
    const queryClient = useQueryClient()
    const { data: session } = useSession()
    const [manageOpen, setManageOpen] = useState(false)

    const { data } = useQuery<CurrentWorkspaces>(trpc.organization.current.queryOptions())
    const team = useQuery<TeamData>({ ...trpc.organization.members.queryOptions(), enabled: manageOpen })

    const refreshAll = () => queryClient.invalidateQueries()
    const onError = (error: { message: string }) => toast.error(error.message)
    const notify = (message: string) => async () => {
        toast.success(message)
        await refreshAll()
    }
    const closeAfter = (message: string) => async () => {
        setManageOpen(false)
        await notify(message)()
    }

    const setActive = useOrgMutation(trpc.organization.setActive.mutationOptions({ onSuccess: refreshAll, onError }))
    const autoSelect = useOrgMutation(trpc.organization.setActive.mutationOptions({ onSuccess: refreshAll }))
    const create = useOrgMutation(trpc.organization.create.mutationOptions({ onSuccess: notify("Workspace created"), onError }))
    const accept = useOrgMutation(trpc.organization.acceptInvitation.mutationOptions({ onSuccess: notify("You joined the workspace"), onError }))
    const decline = useOrgMutation(trpc.organization.rejectInvitation.mutationOptions({ onSuccess: refreshAll, onError }))
    const rename = useOrgMutation(trpc.organization.update.mutationOptions({ onSuccess: notify("Workspace renamed"), onError }))
    const invite = useOrgMutation(trpc.organization.invite.mutationOptions({ onSuccess: notify("Invitation sent"), onError }))
    const cancelInvitation = useOrgMutation(trpc.organization.cancelInvitation.mutationOptions({ onSuccess: notify("Invitation revoked"), onError }))
    const changeRole = useOrgMutation(trpc.organization.updateMemberRole.mutationOptions({ onSuccess: notify("Role updated"), onError }))
    const remove = useOrgMutation(trpc.organization.removeMember.mutationOptions({ onSuccess: notify("Member removed"), onError }))
    const leave = useOrgMutation(trpc.organization.leave.mutationOptions({ onSuccess: closeAfter("You left the workspace"), onError }))
    const destroy = useOrgMutation(trpc.organization.delete.mutationOptions({ onSuccess: closeAfter("Workspace deleted"), onError }))

    const attemptedAutoSelect = useRef(false)
    useEffect(() => {
        const first = data?.organizations?.[0]
        if (data && !data.active && first && !attemptedAutoSelect.current) {
            attemptedAutoSelect.current = true
            autoSelect.mutate({ organizationId: first.id })
        }
    }, [data, autoSelect])

    if (!data) return null

    const busy = [setActive, create, accept, decline, rename, invite, cancelInvitation, changeRole, remove, leave, destroy]
        .some((mutation) => mutation.isPending)

    return (
        <>
            <WorkspaceSwitcher
                organizations={data.organizations}
                activeId={data.active?.id ?? null}
                invitations={data.invitations}
                onSwitch={(organizationId) => setActive.mutate({ organizationId })}
                onCreate={async (name) => {
                    await create.mutateAsync({ name })
                }}
                onManage={() => setManageOpen(true)}
                onAcceptInvitation={(invitationId) => accept.mutate({ invitationId })}
                onDeclineInvitation={(invitationId) => decline.mutate({ invitationId })}
                isBusy={busy}
            />
            <Dialog open={manageOpen} onOpenChange={setManageOpen}>
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Team</DialogTitle>
                    </DialogHeader>
                    {team.data?.organization ? (
                        <TeamSettings
                            organization={team.data.organization}
                            currentRole={team.data.role}
                            currentUserId={session?.user?.id ?? ""}
                            members={team.data.members}
                            invitations={team.data.invitations}
                            onRename={(name) => rename.mutate({ name })}
                            onInvite={(input) => invite.mutate(input)}
                            onCancelInvitation={(invitationId) => cancelInvitation.mutate({ invitationId })}
                            onChangeRole={(memberId, role) => changeRole.mutate({ memberId, role })}
                            onRemove={(memberId) => remove.mutate({ memberId })}
                            onLeave={() => leave.mutate(undefined)}
                            onDelete={() => destroy.mutate(undefined)}
                            isBusy={busy}
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            {team.error?.message ?? "Loading team…"}
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    )
}

export default WorkspaceSlot
