"use client";

import React, { useState, useEffect } from "react";
import { authClient } from "@workspace/auth/better-auth/auth-client";
import { Button } from "@workspace/ui/components/shadcn/button";
import { toast } from "sonner";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { UsersTable } from "@/components/admin/UsersTable";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RegistrationModeToggle } from "@workspace/ui/components/admin/RegistrationModeToggle";
import { InviteUserDialog } from "@workspace/ui/components/admin/InviteUserDialog";
import { InvitationsTable } from "@workspace/ui/components/admin/InvitationsTable";
import { CreateGuestDialog } from "@workspace/ui/components/admin/CreateGuestDialog";

export default function UserManagementPage() {
    const { session, isPending, isAdmin } = useAdminGuard();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    const trpc = useTRPC();
    const qc = useQueryClient();

    const modeQuery = useQuery(trpc.admin.settings.registrationMode.queryOptions());
    const invitesQuery = useQuery(trpc.admin.invites.list.queryOptions(undefined, { enabled: isAdmin }));

    const setMode = useMutation(trpc.admin.settings.setRegistrationMode.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.settings.registrationMode.queryKey() });
            toast.success("Registration mode updated");
        },
        onError: (e: any) => toast.error(e.message || "Failed to update mode"),
    }));

    const createInvite = useMutation(trpc.admin.invites.create.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.invites.list.queryKey() });
            toast.success("Invitation sent");
        },
        onError: (e: any) => toast.error(e.message || "Failed to send invite"),
    }));

    const revokeInvite = useMutation(trpc.admin.invites.revoke.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.invites.list.queryKey() });
            toast.success("Invitation revoked");
        },
        onError: (e: any) => toast.error(e.message || "Failed to revoke"),
    }));

    const resendInvite = useMutation(trpc.admin.invites.resend.mutationOptions({
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: trpc.admin.invites.list.queryKey() });
            toast.success("Invitation resent");
        },
        onError: (e: any) => toast.error(e.message || "Failed to resend"),
    }));

    const fetchUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
            if (error) {
                console.error("Failed to fetch users:", error);
                toast.error("Failed to load users");
            } else if (data) {
                // @ts-ignore - plugin types might be obscured depending on exact setup
                setUsers(data?.users || []);
            }
        } catch (e) {
            console.error("Error fetching users", e);
            toast.error("An error occurred while fetching users");
        } finally {
            setIsLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (isAdmin) fetchUsers();
    }, [isAdmin]);

    const handleSetRole = async (userId: string, newRole: "admin" | "user" | "guest") => {
        try {
            const { error } = await authClient.admin.setRole({ userId, role: newRole });
            if (error) throw error;
            toast.success(`Role updated to ${newRole}`);
            fetchUsers();
        } catch (e: any) {
            toast.error(e.message || "Failed to update role");
        }
    };

    const handleCreateGuest = async (email: string, password: string) => {
        const { error } = await authClient.admin.createUser({ email, password, role: "guest", name: email.split("@")[0] });
        if (error) { toast.error(error.message || "Failed to create guest"); return; }
        toast.success("Guest account created");
        fetchUsers();
    };

    const handleBanToggle = async (userId: string, isBanned: boolean) => {
        try {
            if (isBanned) {
                const { error } = await authClient.admin.unbanUser({ userId });
                if (error) throw error;
                toast.success("User unbanned successfully");
            } else {
                const { error } = await authClient.admin.banUser({ userId });
                if (error) throw error;
                toast.success("User banned successfully");
            }
            fetchUsers();
        } catch (e: any) {
            toast.error(e.message || `Failed to ${isBanned ? 'unban' : 'ban'} user`);
        }
    };

    const handleRemoveUser = async (userId: string) => {
        if (!confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
        try {
            const { error } = await authClient.admin.removeUser({ userId });
            if (error) throw error;
            toast.success("User removed successfully");
            fetchUsers();
        } catch (e: any) {
            toast.error(e.message || "Failed to remove user");
        }
    };

    if (isPending || (!isAdmin && isLoadingUsers)) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto py-10 px-4 md:px-8 max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage registered users in the system.
                    </p>
                </div>
                <Button onClick={fetchUsers} variant="outline" disabled={isLoadingUsers}>
                    {isLoadingUsers ? "Refreshing..." : "Refresh"}
                </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <RegistrationModeToggle
                    mode={(modeQuery.data as "OPEN" | "INVITE_ONLY") ?? "OPEN"}
                    onChange={(mode) => setMode.mutate({ mode })}
                    disabled={setMode.isPending || modeQuery.isLoading}
                />
                <div className="flex items-center gap-2">
                    <CreateGuestDialog onCreate={handleCreateGuest} />
                    <InviteUserDialog
                        onInvite={(email) => createInvite.mutate({ email })}
                        isInviting={createInvite.isPending}
                    />
                </div>
            </div>

            <div className="mb-10">
                <h2 className="text-xl font-semibold mb-3">Invitations</h2>
                <InvitationsTable
                    invitations={invitesQuery.data ?? []}
                    onRevoke={(id) => revokeInvite.mutate({ id })}
                    onResend={(id) => resendInvite.mutate({ id })}
                />
            </div>

            <UsersTable
                users={users}
                isLoading={isLoadingUsers}
                currentUserId={session?.user.id ?? ""}
                onSetRole={handleSetRole}
                onBanToggle={handleBanToggle}
                onRemove={handleRemoveUser}
            />
        </div>
    );
}
