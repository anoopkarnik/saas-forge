"use client";

import React, { useState, useEffect } from "react";
import { authClient } from "@workspace/auth/better-auth/auth-client";
import { Button } from "@workspace/ui/components/shadcn/button";
import { toast } from "sonner";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { UsersTable } from "@/components/admin/UsersTable";

export default function UserManagementPage() {
    const { session, isPending, isAdmin } = useAdminGuard();
    const [users, setUsers] = useState<any[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

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

    const handleSetRole = async (userId: string, newRole: "admin" | "user") => {
        try {
            const { error } = await authClient.admin.setRole({ userId, role: newRole });
            if (error) throw error;
            toast.success(`Role updated to ${newRole}`);
            fetchUsers();
        } catch (e: any) {
            toast.error(e.message || "Failed to update role");
        }
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
