import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useAuth } from "@/lib/auth-provider";
import { Heading, Subtitle, Label, MutedText } from "@/components/common";
import UserManagement from "@/components/admin/UserManagement";
import CmsManagement from "@/components/admin/CmsManagement";
import DocManagement from "@/components/admin/DocManagement";

type AdminSection = "menu" | "users" | "cms" | "docs";

export default function Admin() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const [activeSection, setActiveSection] = useState<AdminSection>("menu");

    if (!isAdmin) {
        return (
            <View className="flex-1 items-center justify-center bg-background px-4">
                <Heading className="text-2xl">Access Denied</Heading>
                <Subtitle className="mb-8">Admin privileges are required to access this page.</Subtitle>
            </View>
        );
    }

    if (activeSection === "users") {
        return <UserManagement onBack={() => setActiveSection("menu")} />;
    }

    if (activeSection === "cms") {
        return <CmsManagement onBack={() => setActiveSection("menu")} />;
    }

    if (activeSection === "docs") {
        return <DocManagement onBack={() => setActiveSection("menu")} />;
    }

    const menuItems = [
        {
            title: "User Management",
            description: "View, manage roles, ban/unban users",
            icon: "👥",
            iconBg: "bg-blue-500/15",
            onPress: () => setActiveSection("users"),
        },
        {
            title: "Content Management",
            description: "Update landing page content via Notion CMS",
            icon: "🗄️",
            iconBg: "bg-red-500/15",
            onPress: () => setActiveSection("cms"),
        },
        {
            title: "Documentation Management",
            description: "Create and edit public documentation pages",
            icon: "📄",
            iconBg: "bg-amber-500/15",
            onPress: () => setActiveSection("docs"),
        },
    ];

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Heading className="text-left text-2xl mb-1">Admin</Heading>
            <Subtitle className="text-left mb-6">Manage your application</Subtitle>

            <View className="gap-3">
                {menuItems.map((item, idx) => (
                    <TouchableOpacity
                        key={idx}
                        className="flex-row items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                        activeOpacity={0.7}
                        onPress={item.onPress}
                    >
                        <View className={`w-12 h-12 rounded-xl ${item.iconBg} items-center justify-center`}>
                            <MutedText className="text-2xl">{item.icon}</MutedText>
                        </View>
                        <View className="flex-1">
                            <Label className="text-base">{item.title}</Label>
                            <MutedText className="text-xs mt-0.5">{item.description}</MutedText>
                        </View>
                        <MutedText className="text-lg">›</MutedText>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}
