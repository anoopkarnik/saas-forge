"use client";

import React from "react";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { ApiRegistryTable } from "@workspace/ui/components/admin/ApiRegistryTable";
import { API_REGISTRY } from "@/trpc/apiRegistry";

export default function ApiManagementPage() {
    const { isPending, isAdmin } = useAdminGuard();

    if (isPending) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto py-10 px-4 md:px-8 max-w-7xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">API Management</h1>
                <p className="text-muted-foreground mt-2">
                    Every tRPC call in the app, grouped by router, with the role required
                    to access it.
                </p>
            </div>

            <ApiRegistryTable data={API_REGISTRY} />
        </div>
    );
}
