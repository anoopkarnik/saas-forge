import { authClient } from "@/lib/auth-client";
import { Platform } from "react-native";

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export type AdminDocumentationDoc = {
    id: string;
    title: string;
    slug: string;
    type: string;
    order: number;
    content: string;
    lastUpdated: string;
};

export type DocumentationEditorInput = {
    title: string;
    slug: string;
    type: string;
    order: number;
    content: string;
};

async function authenticatedFetch(url: string, options?: RequestInit) {
    if (Platform.OS === "web") {
        return fetch(url, { ...options, credentials: "include" });
    }

    return authClient.$fetch(url, options);
}

async function readTrpcBody<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => null);

    if (!res.ok || body?.error) {
        const message =
            body?.error?.json?.message ??
            body?.error?.message ??
            "Request failed";
        throw new Error(message);
    }

    return body?.result?.data?.json ?? body?.result?.data ?? body;
}

export async function fetchAdminDocs(): Promise<AdminDocumentationDoc[]> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/documentation.listAdminDocs`);
    return readTrpcBody<AdminDocumentationDoc[]>(res);
}

export async function fetchAdminDocById(id: string): Promise<AdminDocumentationDoc> {
    const input = encodeURIComponent(JSON.stringify({ id }));
    const res = await authenticatedFetch(`${baseURL}/api/trpc/documentation.getAdminDocById?input=${input}`);
    return readTrpcBody<AdminDocumentationDoc>(res);
}

export async function createAdminDoc(input: DocumentationEditorInput): Promise<AdminDocumentationDoc> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/documentation.createDoc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });

    return readTrpcBody<AdminDocumentationDoc>(res);
}

export async function updateAdminDoc(id: string, input: DocumentationEditorInput): Promise<AdminDocumentationDoc> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/documentation.updateDoc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...input }),
    });

    return readTrpcBody<AdminDocumentationDoc>(res);
}

export async function deleteAdminDoc(id: string): Promise<{ success: boolean }> {
    const res = await authenticatedFetch(`${baseURL}/api/trpc/documentation.deleteDoc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
    });

    return readTrpcBody<{ success: boolean }>(res);
}
