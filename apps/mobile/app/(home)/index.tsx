import { View } from "react-native";
import { useAuth } from "@/lib/auth-provider";
import DownloadConfigForm from "@/components/downloads/DownloadConfigForm";

export default function Home() {
    const { user } = useAuth();

    return (
        <View className="flex-1">
            <DownloadConfigForm
                templateTitle="SaaS Forge Web App"
                onBack={() => { }}
            />
        </View>
    );
}
