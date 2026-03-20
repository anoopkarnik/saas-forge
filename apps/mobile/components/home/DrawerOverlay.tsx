import React, { createContext, useContext, useState, useCallback } from "react";
import {
    View,
    TouchableOpacity,
    Pressable,
    Dimensions,
    ScrollView,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-provider";
import { Label, MutedText } from "@/components/common";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

type DrawerContextType = {
    open: () => void;
    close: () => void;
    isOpen: boolean;
};

const DrawerContext = createContext<DrawerContextType>({
    open: () => { },
    close: () => { },
    isOpen: false,
});

export const useDrawer = () => useContext(DrawerContext);

type DrawerItem = {
    label: string;
    icon: string;
    iconColor: string;
    onPress: () => void;
};

type DrawerOverlayProps = {
    children: React.ReactNode;
};

export const DrawerOverlay = ({ children }: DrawerOverlayProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const translateX = useSharedValue(-DRAWER_WIDTH);
    const backdropOpacity = useSharedValue(0);
    const router = useRouter();
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";

    const open = useCallback(() => {
        setIsOpen(true);
        translateX.value = withTiming(0, {
            duration: 280,
            easing: Easing.out(Easing.cubic),
        });
        backdropOpacity.value = withTiming(1, { duration: 280 });
    }, []);

    const close = useCallback(() => {
        translateX.value = withTiming(-DRAWER_WIDTH, {
            duration: 250,
            easing: Easing.in(Easing.cubic),
        });
        backdropOpacity.value = withTiming(0, { duration: 250 });
        setTimeout(() => {
            runOnJS(setIsOpen)(false);
        }, 260);
    }, []);

    const drawerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const handleSignOut = async () => {
        close();
        await authClient.signOut();
        router.replace("/sign-in");
    };

    const navigateTo = (path: string) => {
        close();
        setTimeout(() => {
            router.push(path as any);
        }, 280);
    };

    const appItems: DrawerItem[] = [
        {
            label: "Home",
            icon: "🏠",
            iconColor: "bg-emerald-500/15",
            onPress: () => navigateTo("/(home)"),
        },
        {
            label: "Support",
            icon: "💬",
            iconColor: "bg-orange-500/15",
            onPress: () => navigateTo("/(home)/support"),
        },
    ];

    const adminItems: DrawerItem[] = [
        {
            label: "User Management",
            icon: "👥",
            iconColor: "bg-blue-500/15",
            onPress: () => navigateTo("/(home)/admin"),
        },
        {
            label: "CMS",
            icon: "🗄️",
            iconColor: "bg-red-500/15",
            onPress: () => navigateTo("/(home)/admin"),
        },
    ];

    const settingsItems: DrawerItem[] = [
        {
            label: "Settings",
            icon: "⚙️",
            iconColor: "bg-gray-500/15",
            onPress: () => navigateTo("/(home)/settings"),
        },
    ];

    return (
        <DrawerContext.Provider value={{ open, close, isOpen }}>
            <View style={{ flex: 1 }}>
                {children}

                {/* Backdrop */}
                {isOpen && (
                    <Pressable
                        className="absolute inset-0 z-40"
                        onPress={close}
                    >
                        <Animated.View
                            className="flex-1 bg-black/50"
                            style={backdropStyle}
                        />
                    </Pressable>
                )}

                {/* Drawer */}
                <Animated.View
                    className="bg-sidebar border-r border-sidebar-border"
                    style={[
                        { position: 'absolute', top: 0, bottom: 0, left: 0, zIndex: 50, width: DRAWER_WIDTH },
                        drawerStyle,
                    ]}
                >
                    {/* Header */}
                    <View className="pt-14 px-5 pb-4 border-b border-sidebar-border/40">
                        <View className="flex-row items-center gap-3">
                            <View className="w-9 h-9 rounded-lg bg-primary items-center justify-center">
                                <Label className="text-primary-foreground text-lg font-bold">S</Label>
                            </View>
                            <View>
                                <Label className="text-base font-bold text-sidebar-foreground">SaaS Forge</Label>
                                <MutedText className="text-xs">Navigation</MutedText>
                            </View>
                        </View>
                    </View>

                    {/* Content */}
                    <ScrollView className="flex-1 px-3 pt-4" showsVerticalScrollIndicator={false}>
                        {/* Application Section */}
                        <MutedText className="text-xs uppercase tracking-wider mb-3 px-2 font-medium">
                            Application
                        </MutedText>
                        <View className="gap-1 mb-6">
                            {appItems.map((item, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    className="flex-row items-center gap-3 px-3 py-2.5 rounded-lg active:bg-sidebar-accent"
                                    activeOpacity={0.7}
                                    onPress={item.onPress}
                                >
                                    <View className={`w-8 h-8 rounded-md ${item.iconColor} items-center justify-center`}>
                                        <MutedText className="text-base">{item.icon}</MutedText>
                                    </View>
                                    <Label className="text-sm text-sidebar-foreground flex-1">{item.label}</Label>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Admin Section */}
                        {isAdmin && (
                            <>
                                <MutedText className="text-xs uppercase tracking-wider mb-3 px-2 font-medium">
                                    Admin
                                </MutedText>
                                <View className="gap-1 mb-6">
                                    {adminItems.map((item, idx) => (
                                        <TouchableOpacity
                                            key={idx}
                                            className="flex-row items-center gap-3 px-3 py-2.5 rounded-lg active:bg-sidebar-accent"
                                            activeOpacity={0.7}
                                            onPress={item.onPress}
                                        >
                                            <View className={`w-8 h-8 rounded-md ${item.iconColor} items-center justify-center`}>
                                                <MutedText className="text-base">{item.icon}</MutedText>
                                            </View>
                                            <Label className="text-sm text-sidebar-foreground flex-1">{item.label}</Label>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        {/* Settings */}
                        <MutedText className="text-xs uppercase tracking-wider mb-3 px-2 font-medium">
                            Settings
                        </MutedText>
                        <View className="gap-1 mb-4">
                            {settingsItems.map((item, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    className="flex-row items-center gap-3 px-3 py-2.5 rounded-lg active:bg-sidebar-accent"
                                    activeOpacity={0.7}
                                    onPress={item.onPress}
                                >
                                    <View className={`w-8 h-8 rounded-md ${item.iconColor} items-center justify-center`}>
                                        <MutedText className="text-base">{item.icon}</MutedText>
                                    </View>
                                    <Label className="text-sm text-sidebar-foreground flex-1">{item.label}</Label>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View className="gap-1">
                            <TouchableOpacity
                                className="flex-row items-center gap-3 px-3 py-2.5 rounded-lg active:bg-sidebar-accent"
                                activeOpacity={0.7}
                                onPress={handleSignOut}
                            >
                                <View className="w-8 h-8 rounded-md bg-destructive/15 items-center justify-center">
                                    <MutedText className="text-base">🚪</MutedText>
                                </View>
                                <Label className="text-sm text-sidebar-foreground">Sign Out</Label>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>

                    {/* Footer — User Info */}
                    <View className="px-5 py-4 border-t border-sidebar-border/40">
                        <View className="flex-row items-center gap-3">
                            <View className="w-9 h-9 rounded-full bg-sidebar-accent items-center justify-center">
                                <Label className="text-sm font-bold text-sidebar-accent-foreground">
                                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                                </Label>
                            </View>
                            <View className="flex-1">
                                <Label className="text-sm text-sidebar-foreground">{user?.name || "User"}</Label>
                                <MutedText className="text-xs" numberOfLines={1}>{user?.email || ""}</MutedText>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </DrawerContext.Provider>
    );
};

export default DrawerOverlay;
