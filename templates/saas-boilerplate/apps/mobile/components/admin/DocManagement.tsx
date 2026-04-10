import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Button, Heading, Input, Label, MutedText, Subtitle } from "@/components/common";
import {
    createAdminDoc,
    deleteAdminDoc,
    fetchAdminDocById,
    fetchAdminDocs,
    updateAdminDoc,
    type AdminDocumentationDoc,
} from "@/lib/documentation-admin-api";

type Props = {
    onBack: () => void;
};

type ScreenState = "list" | "new" | "edit";

type DocDraft = {
    title: string;
    slug: string;
    type: string;
    order: string;
    content: string;
};

const EMPTY_DRAFT: DocDraft = {
    title: "",
    slug: "",
    type: "Guide",
    order: "0",
    content: "",
};

export default function DocManagement({ onBack }: Props) {
    const [screen, setScreen] = useState<ScreenState>("list");
    const [docs, setDocs] = useState<AdminDocumentationDoc[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [draft, setDraft] = useState<DocDraft>(EMPTY_DRAFT);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingDoc, setLoadingDoc] = useState(false);
    const [unsupportedMessage, setUnsupportedMessage] = useState<string | null>(null);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === "web") {
            window.alert(`${title}: ${message}`);
        } else {
            const { Alert: NativeAlert } = require("react-native");
            NativeAlert.alert(title, message);
        }
    };

    const loadDocs = useCallback(async () => {
        try {
            const data = await fetchAdminDocs();
            setDocs(data);
            setUnsupportedMessage(null);
        } catch (error: any) {
            if (error.message?.includes("only available for postgres CMS")) {
                setUnsupportedMessage(error.message);
                setDocs([]);
            } else {
                showAlert("Error", error.message || "Failed to load documentation pages");
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadDocs();
    }, [loadDocs]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadDocs();
    };

    const openCreateForm = () => {
        setDraft(EMPTY_DRAFT);
        setSelectedDocId(null);
        setScreen("new");
    };

    const openEditForm = async (docId: string) => {
        setLoadingDoc(true);
        try {
            const doc = await fetchAdminDocById(docId);
            setSelectedDocId(doc.id);
            setDraft({
                title: doc.title,
                slug: doc.slug,
                type: doc.type,
                order: String(doc.order),
                content: doc.content,
            });
            setScreen("edit");
        } catch (error: any) {
            showAlert("Error", error.message || "Failed to load this documentation page");
        } finally {
            setLoadingDoc(false);
        }
    };

    const handleSave = async () => {
        const payload = {
            title: draft.title.trim(),
            slug: draft.slug.trim(),
            type: draft.type.trim(),
            order: Number(draft.order),
            content: draft.content,
        };

        if (!payload.title || !payload.slug || !payload.type || Number.isNaN(payload.order) || !payload.content.trim()) {
            showAlert("Missing fields", "Please fill in title, slug, type, order, and content before saving.");
            return;
        }

        setSaving(true);
        try {
            if (screen === "new") {
                await createAdminDoc(payload);
                showAlert("Success", "Documentation page created.");
            } else if (selectedDocId) {
                await updateAdminDoc(selectedDocId, payload);
                showAlert("Success", "Documentation page updated.");
            }

            await loadDocs();
            setScreen("list");
            setSelectedDocId(null);
            setDraft(EMPTY_DRAFT);
        } catch (error: any) {
            showAlert("Error", error.message || "Failed to save documentation page");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedDocId) return;

        const runDelete = async () => {
            setSaving(true);
            try {
                await deleteAdminDoc(selectedDocId);
                showAlert("Success", "Documentation page deleted.");
                await loadDocs();
                setScreen("list");
                setSelectedDocId(null);
                setDraft(EMPTY_DRAFT);
            } catch (error: any) {
                showAlert("Error", error.message || "Failed to delete documentation page");
            } finally {
                setSaving(false);
            }
        };

        if (Platform.OS === "web") {
            if (window.confirm("Delete this documentation page? This action cannot be undone.")) {
                await runDelete();
            }
            return;
        }

        const { Alert: NativeAlert } = require("react-native");
        NativeAlert.alert("Delete documentation page", "This action cannot be undone.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => void runDelete() },
        ]);
    };

    const updateDraft = (field: keyof DocDraft, value: string) => {
        setDraft((current) => ({
            ...current,
            [field]: value,
        }));
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
                <MutedText className="mt-3 text-xs">Loading documentation pages...</MutedText>
            </View>
        );
    }

    if (unsupportedMessage) {
        return (
            <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
                <View className="mb-1 flex-row items-center gap-3">
                    <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                        <MutedText className="text-2xl">{"\u2039"}</MutedText>
                    </TouchableOpacity>
                    <Heading className="text-left text-2xl">Documentation Management</Heading>
                </View>
                <Subtitle className="mb-6 text-left">Editing is unavailable in the current CMS mode.</Subtitle>

                <View className="rounded-xl border border-border/40 bg-card p-4">
                    <Label className="mb-2 text-base">Editing unavailable</Label>
                    <MutedText>{unsupportedMessage}</MutedText>
                </View>
            </ScrollView>
        );
    }

    if (screen === "new" || screen === "edit") {
        return (
            <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
                <View className="mb-1 flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => setScreen("list")} activeOpacity={0.7}>
                        <MutedText className="text-2xl">{"\u2039"}</MutedText>
                    </TouchableOpacity>
                    <Heading className="text-left text-2xl">
                        {screen === "new" ? "New Documentation Page" : "Edit Documentation Page"}
                    </Heading>
                </View>
                <Subtitle className="mb-6 text-left">Write Markdown or MDX content for this page.</Subtitle>

                {loadingDoc ? (
                    <View className="mt-10 items-center">
                        <ActivityIndicator size="large" />
                    </View>
                ) : (
                    <View className="gap-4">
                        <View className="gap-2">
                            <Label>Title</Label>
                            <Input value={draft.title} onChangeText={(value) => updateDraft("title", value)} />
                        </View>

                        <View className="gap-2">
                            <Label>Slug</Label>
                            <Input value={draft.slug} onChangeText={(value) => updateDraft("slug", value)} autoCapitalize="none" />
                        </View>

                        <View className="gap-2">
                            <Label>Type</Label>
                            <Input value={draft.type} onChangeText={(value) => updateDraft("type", value)} />
                        </View>

                        <View className="gap-2">
                            <Label>Order</Label>
                            <Input
                                value={draft.order}
                                onChangeText={(value) => updateDraft("order", value)}
                                keyboardType="numeric"
                            />
                        </View>

                        <View className="gap-2">
                            <Label>Content</Label>
                            <TextInput
                                multiline
                                textAlignVertical="top"
                                className="min-h-[320px] rounded-md bg-sidebar/50 px-3 py-3 text-sm text-foreground"
                                placeholder="Write markdown content here..."
                                placeholderTextColor="hsl(240 3.8% 46.1%)"
                                value={draft.content}
                                onChangeText={(value) => updateDraft("content", value)}
                            />
                        </View>

                        <View className="mt-2 flex-row gap-3">
                            <Button
                                label={saving ? "Saving..." : "Save"}
                                loading={saving}
                                onPress={handleSave}
                                className="flex-1"
                            />
                            {screen === "edit" ? (
                                <Button
                                    label="Delete"
                                    variant="outline"
                                    onPress={handleDelete}
                                    className="flex-1"
                                    disabled={saving}
                                />
                            ) : null}
                        </View>
                    </View>
                )}
            </ScrollView>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="p-5 pb-24"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="hsl(142, 81%, 71%)" />
            }
        >
            <View className="mb-1 flex-row items-center gap-3">
                <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                    <MutedText className="text-2xl">{"\u2039"}</MutedText>
                </TouchableOpacity>
                <Heading className="text-left text-2xl">Documentation Management</Heading>
            </View>
            <Subtitle className="mb-6 text-left">Create, edit, and organize your documentation pages.</Subtitle>

            <Button label="Create Documentation Page" onPress={openCreateForm} className="mb-5" />

            <MutedText className="mb-3 text-xs font-medium uppercase tracking-wider">Documentation Pages</MutedText>
            <View className="gap-2">
                {docs.length ? (
                    docs.map((doc) => (
                        <TouchableOpacity
                            key={doc.id}
                            className="flex-row items-center gap-3 rounded-xl border border-border/30 bg-card p-4"
                            activeOpacity={0.7}
                            onPress={() => openEditForm(doc.id)}
                        >
                            <MutedText className="text-xl">{"\uD83D\uDCC4"}</MutedText>
                            <View className="flex-1">
                                <Label className="text-sm">{doc.title}</Label>
                                <MutedText className="mt-0.5 text-xs">
                                    {doc.type} · {doc.slug} · order {doc.order}
                                </MutedText>
                            </View>
                            <MutedText className="text-lg">{"\u203A"}</MutedText>
                        </TouchableOpacity>
                    ))
                ) : (
                    <View className="rounded-xl border border-dashed border-border/40 p-5">
                        <MutedText>No documentation pages yet. Create one to get started.</MutedText>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}
