import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, Linking, TextInput, Alert } from "react-native";
import { Heading, Subtitle, Label, MutedText, Input, Button } from "@/components/common";
import { sendSupportMessage } from "@/lib/support-api";
import { useRouter } from "expo-router";

export default function SupportTab() {
    const router = useRouter();
    const [showMessageForm, setShowMessageForm] = useState(false);
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const showSupportMail = !!process.env.EXPO_PUBLIC_SUPPORT_MAIL;
    const calendlyUrl = process.env.EXPO_PUBLIC_CALENDLY_BOOKING_URL;

    const handleSend = async () => {
        if (!email || !subject || !message) {
            Alert.alert("Error", "Please fill in all fields.");
            return;
        }

        setLoading(true);
        try {
            await sendSupportMessage({ email, subject, message });
            Alert.alert("Success", "Message sent successfully!");
            setEmail("");
            setSubject("");
            setMessage("");
            setShowMessageForm(false);
        } catch {
            Alert.alert("Error", "Failed to send message. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    if (showMessageForm) {
        return (
            <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
                <View className="flex-row items-center gap-3 mb-1">
                    <TouchableOpacity onPress={() => setShowMessageForm(false)} activeOpacity={0.7}>
                        <MutedText className="text-2xl">‹</MutedText>
                    </TouchableOpacity>
                    <Heading className="text-left text-2xl">Contact Us</Heading>
                </View>
                <Subtitle className="text-left mb-6">
                    Send us a message and we'll get back to you shortly.
                </Subtitle>

                <View className="gap-3">
                    <View>
                        <MutedText className="text-xs mb-1.5 font-medium">Email</MutedText>
                        <Input
                            placeholder="Email address"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                            editable={!loading}
                        />
                    </View>
                    <View>
                        <MutedText className="text-xs mb-1.5 font-medium">Subject</MutedText>
                        <Input
                            placeholder="Subject"
                            value={subject}
                            onChangeText={setSubject}
                            editable={!loading}
                        />
                    </View>
                    <View>
                        <MutedText className="text-xs mb-1.5 font-medium">Message</MutedText>
                        <TextInput
                            className="min-h-[140px] w-full rounded-md bg-sidebar/50 px-3 py-2 text-sm text-foreground"
                            placeholderTextColor="hsl(240 3.8% 46.1%)"
                            placeholder="How can we help?"
                            multiline
                            textAlignVertical="top"
                            value={message}
                            onChangeText={setMessage}
                            editable={!loading}
                        />
                    </View>
                </View>

                <View className="flex-row gap-3 mt-6">
                    <Button
                        variant="outline"
                        label="Cancel"
                        onPress={() => setShowMessageForm(false)}
                        disabled={loading}
                        className="flex-1"
                    />
                    <Button
                        label={loading ? "Sending..." : "Send Message"}
                        onPress={handleSend}
                        disabled={loading}
                        loading={loading}
                        className="flex-1"
                    />
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            <Heading className="text-left text-2xl mb-1">Support</Heading>
            <Subtitle className="text-left mb-6">How can we help?</Subtitle>

            <View className="gap-3">
                {showSupportMail && (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setShowMessageForm(true)}
                        className="flex-row items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                    >
                        <View className="w-12 h-12 rounded-xl bg-orange-500/15 items-center justify-center">
                            <MutedText className="text-2xl">✉️</MutedText>
                        </View>
                        <View className="flex-1">
                            <Label className="text-base">Send Message</Label>
                            <MutedText className="text-xs mt-0.5">
                                Drop us a message and we'll respond shortly
                            </MutedText>
                        </View>
                        <MutedText className="text-lg">›</MutedText>
                    </TouchableOpacity>
                )}

                {calendlyUrl && (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => Linking.openURL(calendlyUrl)}
                        className="flex-row items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                    >
                        <View className="w-12 h-12 rounded-xl bg-cyan-500/15 items-center justify-center">
                            <MutedText className="text-2xl">📅</MutedText>
                        </View>
                        <View className="flex-1">
                            <Label className="text-base">Book Meeting</Label>
                            <MutedText className="text-xs mt-0.5">
                                Schedule a call via Calendly
                            </MutedText>
                        </View>
                        <MutedText className="text-lg">›</MutedText>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push("/documentation")}
                    className="flex-row items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                >
                    <View className="w-12 h-12 rounded-xl bg-indigo-500/15 items-center justify-center">
                        <MutedText className="text-2xl">📰</MutedText>
                    </View>
                    <View className="flex-1">
                        <Label className="text-base">Documentation</Label>
                        <MutedText className="text-xs mt-0.5">
                            Read our guides and API docs
                        </MutedText>
                    </View>
                    <MutedText className="text-lg">›</MutedText>
                </TouchableOpacity>
            </View>
        </ScrollView >
    );
}
