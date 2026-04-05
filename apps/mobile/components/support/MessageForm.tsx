import { useState } from "react";
import { View, TextInput, Alert } from "react-native";
import { Input, Button, Heading, Subtitle, Label } from "@/components/common";
import { sendSupportMessage } from "@/lib/support-api";

type MessageFormProps = {
    onClose: () => void;
};

const MessageForm = ({ onClose }: MessageFormProps) => {
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

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
            onClose();
        } catch {
            Alert.alert("Error", "Failed to send message. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="gap-4">
            <View>
                <Heading className="text-lg">Contact Us</Heading>
                <Subtitle className="mt-0">
                    Have questions? Send us a message and we'll get back to you shortly.
                </Subtitle>
            </View>

            <View className="gap-3">
                <Input
                    placeholder="Email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!loading}
                />
                <Input
                    placeholder="Subject"
                    value={subject}
                    onChangeText={setSubject}
                    editable={!loading}
                />
                <TextInput
                    className="min-h-[120px] w-full rounded-md bg-sidebar/50 px-3 py-2 text-sm text-foreground"
                    placeholderTextColor="hsl(240 3.8% 46.1%)"
                    placeholder="How can we help?"
                    multiline
                    textAlignVertical="top"
                    value={message}
                    onChangeText={setMessage}
                    editable={!loading}
                />
            </View>

            <View className="flex-row items-center justify-between gap-3 pt-2">
                <Button
                    variant="ghost"
                    label="Cancel"
                    onPress={onClose}
                    disabled={loading}
                />
                <Button
                    label={loading ? "Sending..." : "Send Message"}
                    onPress={handleSend}
                    disabled={loading}
                    loading={loading}
                />
            </View>
        </View>
    );
};

export default MessageForm;
