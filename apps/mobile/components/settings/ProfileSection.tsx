import React, { useState } from "react";
import { View, Image, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { authClient } from "@/lib/auth-client";
import { useAuth } from "@/lib/auth-provider";
import { Heading, Label, MutedText, ErrorText, Button } from "@/components/common";
import { Input } from "@/components/common";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function ProfileSection() {
    const { user } = useAuth();
    const [name, setName] = useState(user?.name || "");
    const [isUpdatingName, setIsUpdatingName] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarUri, setAvatarUri] = useState<string | null>(user?.image || null);

    const handleUpdateName = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Name cannot be empty");
            return;
        }
        setIsUpdatingName(true);
        try {
            const { error } = await authClient.updateUser({ name: name.trim() });
            if (error) {
                Alert.alert("Error", "Failed to update name");
            } else {
                Alert.alert("Success", "Name updated successfully");
            }
        } catch {
            Alert.alert("Error", "Failed to update name");
        } finally {
            setIsUpdatingName(false);
        }
    };

    const handlePickAvatar = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "Please allow access to your photo library.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets?.[0]) return;

        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            Alert.alert("Error", "File size exceeds 5MB limit.");
            return;
        }

        setIsUploadingAvatar(true);
        try {
            const localUriFetch = await fetch(asset.uri);
            const blob = await localUriFetch.blob();

            const formData = new FormData();
            formData.append("file", blob, asset.fileName || `avatar_${Date.now()}.jpg`);

            const { data, error: uploadError } = await authClient.$fetch(`${API_URL}/api/settings/modifyAvatar`, {
                method: "POST",
                body: formData,
            });

            if (uploadError) throw new Error(uploadError.message || "Upload failed");

            const imageUrl = (data as any)?.url;
            if (imageUrl) {
                const { error } = await authClient.updateUser({ image: imageUrl });
                if (error) {
                    Alert.alert("Error", "Failed to update profile picture");
                } else {
                    setAvatarUri(imageUrl);
                    Alert.alert("Success", "Profile picture updated");
                }
            }
        } catch {
            Alert.alert("Error", "Failed to upload image");
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const initial = user?.name ? user.name[0].toUpperCase() : "U";

    return (
        <View className="mb-6">
            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Profile
            </MutedText>
            <View className="rounded-xl bg-card border border-border/30 p-4">
                {/* Avatar */}
                <View className="items-center mb-5">
                    <TouchableOpacity
                        onPress={handlePickAvatar}
                        disabled={isUploadingAvatar}
                        activeOpacity={0.7}
                    >
                        <View className="h-24 w-24 rounded-full bg-sidebar/50 items-center justify-center overflow-hidden border-2 border-border/40">
                            {avatarUri ? (
                                <Image
                                    source={{ uri: avatarUri }}
                                    className="h-24 w-24"
                                    resizeMode="cover"
                                />
                            ) : (
                                <Label className="text-3xl text-muted-foreground">{initial}</Label>
                            )}
                        </View>
                        <View className="absolute bottom-0 right-0 bg-primary rounded-full h-7 w-7 items-center justify-center">
                            <MutedText className="text-xs text-primary-foreground">
                                {isUploadingAvatar ? "..." : "\u270F\uFE0F"}
                            </MutedText>
                        </View>
                    </TouchableOpacity>
                    <MutedText className="text-xs mt-2">Tap to change photo</MutedText>
                </View>

                {/* Name */}
                <View className="mb-4">
                    <Label className="text-sm mb-2">Display Name</Label>
                    <View className="flex-row gap-2">
                        <View className="flex-1">
                            <Input
                                value={name}
                                onChangeText={setName}
                                placeholder="Your name"
                            />
                        </View>
                        <Button
                            label={isUpdatingName ? "..." : "Update"}
                            variant="primary"
                            onPress={handleUpdateName}
                            disabled={isUpdatingName}
                            className="h-10 px-4 w-auto"
                        />
                    </View>
                </View>

                {/* Email (read-only) */}
                <View>
                    <Label className="text-sm mb-2">Email</Label>
                    <View className="h-10 w-full rounded-md bg-sidebar/30 px-3 justify-center">
                        <MutedText className="text-sm">{user?.email || "---"}</MutedText>
                    </View>
                </View>
            </View>
        </View>
    );
}
