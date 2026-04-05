import React, { useState } from "react";
import {
    View,
    TextInput,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Label, MutedText } from "@/components/common";

type CmsImageFieldProps = {
    label: string;
    value: string;
    onChangeText: (url: string) => void;
    placeholder?: string;
};

const baseURL = process.env.EXPO_PUBLIC_API_URL;

export default function CmsImageField({
    label,
    value,
    onChangeText,
    placeholder = "Paste URL or upload an image",
}: CmsImageFieldProps) {
    const [uploading, setUploading] = useState(false);
    const [previewError, setPreviewError] = useState(false);

    const pickAndUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsEditing: true,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        setUploading(true);

        try {
            const formData = new FormData();

            if (Platform.OS === "web") {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                formData.append("file", blob, asset.fileName || `upload_${Date.now()}.jpg`);
            } else {
                formData.append("file", {
                    uri: asset.uri,
                    name: asset.fileName || `upload_${Date.now()}.jpg`,
                    type: asset.mimeType || "image/jpeg",
                } as any);
            }

            const res = await fetch(`${baseURL}/api/cms/upload`, {
                method: "POST",
                credentials: "include",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || "Upload failed");
            }

            const { url } = await res.json();
            onChangeText(url);
            setPreviewError(false);
        } catch (err: any) {
            const msg = err.message || "Failed to upload image";
            if (Platform.OS === "web") {
                window.alert(msg);
            } else {
                const { Alert: NativeAlert } = require("react-native");
                NativeAlert.alert("Upload Error", msg);
            }
        } finally {
            setUploading(false);
        }
    };

    return (
        <View className="mb-4">
            <Label className="text-xs mb-1.5">{label}</Label>
            <View className="flex-row items-center gap-2">
                <TextInput
                    className="flex-1 h-10 rounded-lg bg-sidebar/50 px-3 text-sm text-foreground border border-border/30"
                    value={value}
                    onChangeText={(v) => {
                        onChangeText(v);
                        setPreviewError(false);
                    }}
                    placeholder={placeholder}
                    placeholderTextColor="hsl(240 3.8% 46.1%)"
                />
                <TouchableOpacity
                    className="h-10 w-10 rounded-lg bg-sidebar/50 border border-border/30 items-center justify-center"
                    activeOpacity={0.7}
                    onPress={pickAndUpload}
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator size="small" />
                    ) : (
                        <MutedText className="text-base">{"\u2B06"}</MutedText>
                    )}
                </TouchableOpacity>
            </View>
            {value && !previewError ? (
                <Image
                    source={{ uri: value }}
                    className="h-16 w-auto mt-2 rounded-lg border border-border/20"
                    style={{ height: 64, width: "auto", minWidth: 64, maxWidth: "100%" }}
                    resizeMode="contain"
                    onError={() => setPreviewError(true)}
                />
            ) : null}
        </View>
    );
}
