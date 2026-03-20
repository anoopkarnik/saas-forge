import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Label } from "@/components/common";
import { useAuth } from "@/lib/auth-provider";
import { useCredits } from "@/lib/credits-provider";

type TabHeaderProps = {
    title?: string;
};

const TabHeader = ({ title = "SaaS Forge" }: TabHeaderProps) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { credits } = useCredits();

    const displayName = user?.name?.split(" ")[0] ?? "User";
    const initial = (user?.name ?? "U").charAt(0).toUpperCase();
    const available = credits ? credits.creditsTotal - credits.creditsUsed : null;

    return (
        <View
            className="bg-sidebar border-b border-sidebar-border/40"
            style={{ paddingTop: insets.top }}
        >
            <View className="flex-row items-center justify-between px-4 h-14">
                {/* Left: user avatar + name */}
                <View className="flex-row items-center gap-2.5 flex-1">
                    {user?.image ? (
                        <Image
                            source={{ uri: user.image }}
                            className="w-8 h-8 rounded-full"
                        />
                    ) : (
                        <View className="w-8 h-8 rounded-full bg-primary/15 items-center justify-center">
                            <Label className="text-primary text-sm font-bold">
                                {initial}
                            </Label>
                        </View>
                    )}
                    <Label className="text-sm text-sidebar-foreground font-medium">
                        {displayName}
                    </Label>
                </View>

                {/* Center: app title */}
                <View className="flex-row items-center gap-2">
                    <View className="w-7 h-7 rounded-md bg-primary items-center justify-center">
                        <Label className="text-primary-foreground text-sm font-bold">
                            {title.charAt(0)}
                        </Label>
                    </View>
                    <Label className="text-base font-bold text-sidebar-foreground">
                        {title}
                    </Label>
                </View>

                {/* Right: credits badge */}
                <View className="flex-row items-center justify-end flex-1">
                    {available !== null && (
                        <View className="flex-row items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
                            <Ionicons
                                name="sparkles"
                                size={14}
                                color="hsl(142, 81%, 71%)"
                            />
                            <Label className="text-xs font-semibold text-primary">
                                {available.toLocaleString()}
                            </Label>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default TabHeader;
