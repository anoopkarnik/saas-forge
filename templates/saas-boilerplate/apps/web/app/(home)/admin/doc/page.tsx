"use client";

import React, { useEffect, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/shadcn/card";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Loader2, FileText, Plus, RefreshCw, Trash2, Save } from "lucide-react";

type DocFormState = {
    title: string;
    slug: string;
    type: string;
    order: string;
    content: string;
};

const EMPTY_FORM: DocFormState = {
    title: "",
    slug: "",
    type: "Guide",
    order: "0",
    content: "",
};

export default function DocumentationAdminPage() {
    const { isPending, isAdmin } = useAdminGuard();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const cmsProvider = process.env.NEXT_PUBLIC_CMS || "notion";
    const isPostgresCms = cmsProvider === "postgres";

    const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
    const [form, setForm] = useState<DocFormState>(EMPTY_FORM);

    const docsQuery = useQuery({
        ...trpc.documentation.listAdminDocs.queryOptions(undefined, {
            enabled: isAdmin && isPostgresCms,
        }),
        retry: false,
    });

    const selectedDocQuery = useQuery({
        ...trpc.documentation.getAdminDocById.queryOptions(
            { id: typeof selectedId === "string" ? selectedId : "" },
            {
                enabled: isAdmin && isPostgresCms && typeof selectedId === "string",
            },
        ),
        retry: false,
    });

    useEffect(() => {
        if (!docsQuery.data || selectedId !== null) return;
        const firstDoc = docsQuery.data[0];
        if (firstDoc) {
            setSelectedId(firstDoc.id);
        } else {
            setSelectedId("new");
        }
    }, [docsQuery.data, selectedId]);

    useEffect(() => {
        if (selectedId === "new") {
            setForm(EMPTY_FORM);
            return;
        }

        if (!selectedDocQuery.data) return;

        setForm({
            title: selectedDocQuery.data.title,
            slug: selectedDocQuery.data.slug,
            type: selectedDocQuery.data.type,
            order: String(selectedDocQuery.data.order),
            content: selectedDocQuery.data.content,
        });
    }, [selectedId, selectedDocQuery.data]);

    const refreshAdminQueries = async () => {
        await Promise.all([
            queryClient.invalidateQueries(trpc.documentation.listAdminDocs.queryFilter()),
            queryClient.invalidateQueries(trpc.documentation.getDocumentationInfoFromNotion.queryFilter()),
        ]);
    };

    const createDocMutation = useMutation(
        trpc.documentation.createDoc.mutationOptions({
            onSuccess: async (createdDoc) => {
                toast.success("Documentation page created");
                setSelectedId(createdDoc.id);
                await refreshAdminQueries();
            },
            onError: (error) => {
                toast.error(error.message || "Failed to create documentation page");
            },
        }),
    );

    const updateDocMutation = useMutation(
        trpc.documentation.updateDoc.mutationOptions({
            onSuccess: async (updatedDoc) => {
                toast.success("Documentation page updated");
                await Promise.all([
                    refreshAdminQueries(),
                    queryClient.invalidateQueries(trpc.documentation.getAdminDocById.queryFilter({ id: updatedDoc.id })),
                ]);
            },
            onError: (error) => {
                toast.error(error.message || "Failed to update documentation page");
            },
        }),
    );

    const deleteDocMutation = useMutation(
        trpc.documentation.deleteDoc.mutationOptions({
            onSuccess: async () => {
                toast.success("Documentation page deleted");
                setSelectedId(null);
                setForm(EMPTY_FORM);
                await refreshAdminQueries();
            },
            onError: (error) => {
                toast.error(error.message || "Failed to delete documentation page");
            },
        }),
    );

    const isSaving = createDocMutation.isPending || updateDocMutation.isPending;
    const activeDoc = docsQuery.data?.find((doc) => doc.id === selectedId) ?? null;

    const handleFieldChange = (field: keyof DocFormState, value: string) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };

    const handleNewDoc = () => {
        setSelectedId("new");
        setForm(EMPTY_FORM);
    };

    const handleSave = () => {
        const payload = {
            title: form.title.trim(),
            slug: form.slug.trim(),
            type: form.type.trim(),
            order: Number(form.order),
            content: form.content,
        };

        if (!payload.title || !payload.slug || !payload.type || Number.isNaN(payload.order) || !payload.content.trim()) {
            toast.error("Please fill in title, slug, type, order, and content.");
            return;
        }

        if (selectedId === "new") {
            createDocMutation.mutate(payload);
            return;
        }

        if (typeof selectedId === "string") {
            updateDocMutation.mutate({
                id: selectedId,
                ...payload,
            });
        }
    };

    const handleDelete = () => {
        if (typeof selectedId !== "string" || !activeDoc) return;
        if (!confirm(`Delete "${activeDoc.title}"? This action cannot be undone.`)) return;
        deleteDocMutation.mutate({ id: selectedId });
    };

    if (isPending || (isPostgresCms && docsQuery.isLoading)) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 md:px-8">
            <div className="mb-8 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="rounded-xl bg-primary/10 p-3">
                        <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Documentation Management</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Create, edit, and organize your public documentation pages.
                        </p>
                    </div>
                </div>

                {isPostgresCms ? (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => docsQuery.refetch()} disabled={docsQuery.isFetching}>
                            <RefreshCw className={`h-4 w-4 ${docsQuery.isFetching ? "animate-spin" : ""}`} />
                            Refresh
                        </Button>
                        <Button onClick={handleNewDoc}>
                            <Plus className="h-4 w-4" />
                            New Doc
                        </Button>
                    </div>
                ) : null}
            </div>

            {!isPostgresCms ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Editing Unavailable</CardTitle>
                        <CardDescription>
                            Documentation editing is only available for postgres CMS right now. Your current CMS provider is{" "}
                            <span className="font-medium text-foreground">{cmsProvider}</span>.
                        </CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <Card className="h-fit">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Documentation Pages</CardTitle>
                            <CardDescription>
                                {docsQuery.data?.length ?? 0} page{docsQuery.data?.length === 1 ? "" : "s"} in this project
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {docsQuery.data?.length ? (
                                docsQuery.data.map((doc) => (
                                    <button
                                        key={doc.id}
                                        type="button"
                                        onClick={() => setSelectedId(doc.id)}
                                        className={`w-full rounded-lg border p-4 text-left transition ${
                                            selectedId === doc.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                                        }`}
                                    >
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <div className="truncate font-medium">{doc.title}</div>
                                            <Badge variant="secondary">{doc.type}</Badge>
                                        </div>
                                        <div className="space-y-1 text-xs text-muted-foreground">
                                            <div>Slug: {doc.slug}</div>
                                            <div>Order: {doc.order}</div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                                    No documentation pages yet. Create your first one to get started.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <CardTitle>{selectedId === "new" ? "Create Documentation Page" : "Edit Documentation Page"}</CardTitle>
                                    <CardDescription>
                                        Markdown and MDX-style content are stored in the documentation record.
                                    </CardDescription>
                                </div>
                                {typeof selectedId === "string" ? (
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={deleteDocMutation.isPending}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </Button>
                                ) : null}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            {selectedDocQuery.isLoading && typeof selectedId === "string" ? (
                                <div className="flex min-h-[320px] items-center justify-center">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Title</label>
                                            <Input value={form.title} onChange={(event) => handleFieldChange("title", event.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Slug</label>
                                            <Input value={form.slug} onChange={(event) => handleFieldChange("slug", event.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Type</label>
                                            <Input value={form.type} onChange={(event) => handleFieldChange("type", event.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Order</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={form.order}
                                                onChange={(event) => handleFieldChange("order", event.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Content</label>
                                        <Textarea
                                            rows={20}
                                            className="font-mono text-sm"
                                            value={form.content}
                                            onChange={(event) => handleFieldChange("content", event.target.value)}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <p className="text-xs text-muted-foreground">
                                            {activeDoc?.lastUpdated
                                                ? `Last updated ${new Date(activeDoc.lastUpdated).toLocaleString()}`
                                                : "This page has not been saved yet."}
                                        </p>
                                        <Button onClick={handleSave} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Save
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
