import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Label, MutedText } from "@/components/common";
import {
    fetchCurrentOrganizations,
    setActiveOrganization,
    type CurrentOrganizations,
} from "@/lib/organization-api";

// Workspace selector slot (multi_tenancy module). Settings renders this
// unconditionally; scaffolds without the module get a stub that renders null.
// Team management and invitations live in the web app.
export default function OrgSelector() {
    const [data, setData] = useState<CurrentOrganizations | null>(null);
    const [switchingId, setSwitchingId] = useState<string | null>(null);

    const load = async () => {
        try {
            setData(await fetchCurrentOrganizations());
        } catch {
            setData(null);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const handleSwitch = async (organizationId: string) => {
        if (organizationId === data?.active?.id) return;
        setSwitchingId(organizationId);
        try {
            await setActiveOrganization(organizationId);
            await load();
        } catch (error) {
            Alert.alert("Error", error instanceof Error ? error.message : "Failed to switch workspace");
        } finally {
            setSwitchingId(null);
        }
    };

    if (!data || data.organizations.length === 0) return null;

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Workspace
            </MutedText>
            <View className="rounded-xl bg-card border border-border/30 overflow-hidden">
                {data.organizations.map((org, index) => {
                    const isActive = org.id === data.active?.id;
                    return (
                        <Pressable
                            key={org.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: isActive }}
                            onPress={() => handleSwitch(org.id)}
                            className={`flex-row items-center gap-3 p-4 ${index > 0 ? "border-t border-border/20" : ""}`}
                        >
                            <View className="flex-1">
                                <Label className="text-sm">{org.name}</Label>
                                <MutedText className="text-xs capitalize">{org.role}</MutedText>
                            </View>
                            {switchingId === org.id ? (
                                <ActivityIndicator size="small" />
                            ) : isActive ? (
                                <MutedText className="text-sm text-primary">{"✓"} Active</MutedText>
                            ) : null}
                        </Pressable>
                    );
                })}
            </View>
            {data.invitations.length > 0 && (
                <MutedText className="text-xs mt-2">
                    You have {data.invitations.length} pending invitation
                    {data.invitations.length === 1 ? "" : "s"}. Accept from the web or desktop app.
                </MutedText>
            )}
        </View>
    );
}
