import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

// Organizations (multi_tenancy module) over the web app's tRPC endpoints.

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export type OrganizationSummary = {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    role: string;
};

export type CurrentOrganizations = {
    active: OrganizationSummary | null;
    organizations: OrganizationSummary[];
    invitations: Array<{ id: string; organizationName: string; inviterName: string; role: string }>;
};

async function authenticatedFetch(url: string, options?: RequestInit) {
    if (Platform.OS === "web") {
        return fetch(url, { ...options, credentials: "include" });
    }
    return authClient.$fetch(url, options);
}

export async function fetchCurrentOrganizations(): Promise<CurrentOrganizations> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/organization.current`);
    if (!res.ok) {
        throw new Error("Failed to load workspaces");
    }
    const json = await res.json();
    return json.result?.data?.json ?? json.result?.data ?? json;
}

export async function setActiveOrganization(organizationId: string): Promise<void> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/organization.setActive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
    });
    if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error?.json?.message ?? error?.error?.message ?? "Failed to switch workspace");
    }
}
