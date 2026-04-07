import { Image, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Label } from "@/components/common";
import { useAuth } from "@/lib/auth-provider";

type TabHeaderProps = {
    title?: string;
};

const TabHeader = ({ title = "SaaS Forge" }: TabHeaderProps) => {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const displayName = user?.name?.split(" ")[0] ?? "User";
    const initial = (user?.name ?? "U").charAt(0).toUpperCase();

    return (
        <View
            className="bg-sidebar border-b border-sidebar-border/40"
            style={{ paddingTop: insets.top }}
        >
            <View className="flex-row items-center justify-between px-4 h-14">
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

                <View className="flex-1" />
            </View>
        </View>
    );
};

export default TabHeader;
