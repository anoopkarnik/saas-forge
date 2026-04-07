import React, { useState } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
} from "react-native";

import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File as ExpoFile, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Heading, Subtitle, Label, MutedText, ErrorText, Input, Button } from "@/components/common";
import { authClient } from "@/lib/auth-client";

type Props = {
    templateTitle: string;
    onBack?: () => void;
};

type SectionState = Record<string, boolean>;

import {
    THEME_OPTIONS, THEME_TYPE_OPTIONS, PLATFORM_OPTIONS, CMS_OPTIONS, AUTH_FRAMEWORK_OPTIONS,
    AUTH_PROVIDER_OPTIONS, EMAIL_CLIENT_OPTIONS, SUPPORT_FEATURE_OPTIONS, IMAGE_STORAGE_OPTIONS,
    OBSERVABILITY_FEATURE_OPTIONS, RATE_LIMIT_OPTIONS, PAYMENT_ENV_KEYS, PAYMENT_GATEWAY_OPTIONS, DODO_ENV_OPTIONS,
    FormState, DEFAULT_FORM, STRING_FIELD_KEYS, SCAFFOLD_MODULE_OPTIONS, BASE_SCAFFOLD_CREDITS_COST
} from "./constants";
import { parseMobileEnvFile } from "./envParser";

export default function DownloadConfigForm({ templateTitle, onBack }: Props) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [expandedSections, setExpandedSections] = useState<SectionState>({
        project: true,
        landing: false,
        auth: false,
        support: false,
        storage: false,
        observability: false,
        payment: false,
    });
    const [formValues, setFormValues] = useState<FormState>({ ...DEFAULT_FORM });
    const selectedBilling = formValues.SELECTED_MODULES.includes("billing");
    const totalCreditsCost =
        BASE_SCAFFOLD_CREDITS_COST +
        SCAFFOLD_MODULE_OPTIONS.filter((module) =>
            formValues.SELECTED_MODULES.includes(module.value)
        ).reduce((sum, module) => sum + module.creditsCost, 0);

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const updateField = (key: keyof FormState, value: string) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const toggleArrayField = (key: keyof FormState, value: string) => {
        setFormValues((prev) => {
            const arr = prev[key] as string[];
            const nextValues = {
                ...prev,
                [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
            };

            if (
                key === "SELECTED_MODULES" &&
                value === "billing" &&
                !nextValues.SELECTED_MODULES.includes("billing")
            ) {
                nextValues.NEXT_PUBLIC_PAYMENT_GATEWAY = "none";
            }

            return nextValues;
        });
    };

    // ─── .env File Upload ──────────────────────────────────────────────
    const handleEnvUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
            });

            if (result.canceled || !result.assets?.[0]) return;

            const asset = result.assets[0];
            let content: string;

            if (Platform.OS === "web") {
                // On web, fetch the blob URI and read as text
                const resp = await fetch(asset.uri);
                content = await resp.text();
            } else {
                // On native, dynamically import expo-file-system to avoid web error
                const FileSystem = await import("expo-file-system");
                content = await FileSystem.readAsStringAsync(asset.uri);
            }

            if (!content) return;

            const { newValues, count } = parseMobileEnvFile(content, formValues);
            setFormValues(newValues);
            Alert.alert("Imported", `Auto-filled ${count} fields from .env file`);
        } catch (error) {
            Alert.alert("Error", "Failed to read .env file");
        }
    };

    // ─── Submit ────────────────────────────────────────────────────────
    const handleDownload = async () => {
        if (!formValues.name.trim()) {
            Alert.alert("Required", "Please enter a project name");
            return;
        }

        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        if (!apiUrl) {
            Alert.alert("Error", "API URL not configured");
            return;
        }

        setIsDownloading(true);
        try {
            const safeName = formValues.name
                .trim()
                .replace(/[^\w.-]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 80);

            const envVars: Record<string, string> = {};

            // Map all string fields
            for (const key of STRING_FIELD_KEYS) {
                const val = formValues[key];
                if (!selectedBilling && PAYMENT_ENV_KEYS.includes(key)) {
                    continue;
                }
                if (typeof val === "string" && val.trim()) {
                    envVars[key as string] = val;
                }
            }

            // Auth providers → boolean flags
            const selectedProviders = formValues.NEXT_PUBLIC_AUTH_PROVIDERS;
            envVars["NEXT_PUBLIC_AUTH_EMAIL"] = selectedProviders.includes("email_verification") ? "true" : "false";
            envVars["NEXT_PUBLIC_AUTH_GOOGLE"] = selectedProviders.includes("google") ? "true" : "false";
            envVars["NEXT_PUBLIC_AUTH_GITHUB"] = selectedProviders.includes("github") ? "true" : "false";
            envVars["NEXT_PUBLIC_AUTH_LINKEDIN"] = selectedProviders.includes("linkedin") ? "true" : "false";

            // Array fields as comma-separated
            if (formValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES.length > 0) {
                envVars["NEXT_PUBLIC_OBSERVABILITY_FEATURES"] = formValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES.join(",");
            }
            if (formValues.NEXT_PUBLIC_SUPPORT_FEATURES.length > 0) {
                envVars["NEXT_PUBLIC_SUPPORT_FEATURES"] = formValues.NEXT_PUBLIC_SUPPORT_FEATURES.join(",");
            }
            if (formValues.NEXT_PUBLIC_PLATFORM.length > 0) {
                envVars["NEXT_PUBLIC_PLATFORM"] = formValues.NEXT_PUBLIC_PLATFORM.join(",");
            }

            const selectedModules = [...formValues.SELECTED_MODULES];

            if (Platform.OS === "web") {
                // Web: use native browser download (credentials needed for auth cookies)
                const response = await fetch(`${apiUrl}/api/scaffold`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ name: safeName, envVars, modules: selectedModules }),
                });

                if (!response.ok) throw new Error("Failed to generate boilerplate");

                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${safeName}.zip`;
                a.click();
                URL.revokeObjectURL(url);

                Alert.alert("Success", "Your boilerplate has been downloaded!");
            } else {
                // Native: fetch zip bytes, write to cache, then share
                const response = await fetch(`${apiUrl}/api/scaffold`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: safeName, envVars, modules: selectedModules }),
                });

                if (!response.ok) throw new Error("Failed to generate boilerplate");

                const arrayBuffer = await response.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);

                const file = new ExpoFile(Paths.cache, `${safeName}.zip`);
                if (file.exists) file.delete();
                file.create();
                file.write(bytes);

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(file.uri, {
                        mimeType: "application/zip",
                        dialogTitle: `Save ${safeName}.zip`,
                    });
                } else {
                    Alert.alert("Downloaded", `File saved to cache.`);
                }
            }
        } catch (error) {
            Alert.alert("Error", "Download failed. Please try again or use the web dashboard.");
        } finally {
            setIsDownloading(false);
        }
    };

    // ─── UI Helpers ────────────────────────────────────────────────────
    const renderSection = (
        id: string,
        title: string,
        icon: string,
        color: string,
        description: string,
        children: React.ReactNode
    ) => (
        <View key={id} className="rounded-xl bg-card border border-border/30 overflow-hidden mb-3">
            <TouchableOpacity
                className="flex-row items-center gap-3 p-4"
                activeOpacity={0.7}
                onPress={() => toggleSection(id)}
            >
                <MutedText className={`text-lg ${color}`}>{icon}</MutedText>
                <View className="flex-1">
                    <Label className="text-sm">{title}</Label>
                    <MutedText className="text-xs">{description}</MutedText>
                </View>
                <MutedText className="text-sm">
                    {expandedSections[id] ? "▾" : "▸"}
                </MutedText>
            </TouchableOpacity>
            {expandedSections[id] && (
                <View className="px-4 pb-4 gap-3">{children}</View>
            )}
        </View>
    );

    const renderField = (label: string, key: keyof FormState, placeholder: string, secure = false) => (
        <View key={key as string}>
            <MutedText className="text-xs mb-1.5 font-medium">{label}</MutedText>
            <Input
                value={formValues[key] as string}
                onChangeText={(text) => updateField(key, text)}
                placeholder={placeholder}
                secureTextEntry={secure}
                autoCapitalize="none"
                autoCorrect={false}
            />
        </View>
    );

    const renderSelect = (
        label: string,
        key: keyof FormState,
        options: { value: string; label: string; disabled?: boolean }[]
    ) => (
        <View key={key as string}>
            <MutedText className="text-xs mb-2 font-medium">{label}</MutedText>
            <View className="flex-row flex-wrap gap-2">
                {options.map((opt) => (
                    <TouchableOpacity
                        key={opt.value}
                        className={`px-3 py-2 rounded-lg border ${formValues[key] === opt.value
                            ? "border-primary bg-primary/10"
                            : "border-border/30 bg-card"
                            } ${opt.disabled ? "opacity-40" : ""}`}
                        activeOpacity={0.7}
                        disabled={opt.disabled}
                        onPress={() => updateField(key, opt.value)}
                    >
                        <Label className="text-xs">{opt.label}</Label>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderMultiselect = (
        label: string,
        key: keyof FormState,
        options: { value: string; label: string; disabled?: boolean }[]
    ) => (
        <View key={key as string}>
            <MutedText className="text-xs mb-2 font-medium">{label}</MutedText>
            <View className="gap-2">
                {options.map((opt) => {
                    const arr = formValues[key] as string[];
                    const selected = arr.includes(opt.value);
                    return (
                        <TouchableOpacity
                            key={opt.value}
                            className={`flex-row items-center gap-3 p-3 rounded-lg border ${selected ? "border-primary bg-primary/10" : "border-border/30 bg-card"
                                } ${opt.disabled ? "opacity-40" : ""}`}
                            activeOpacity={0.7}
                            disabled={opt.disabled}
                            onPress={() => toggleArrayField(key, opt.value)}
                        >
                            <View
                                className={`w-5 h-5 rounded border items-center justify-center ${selected ? "border-primary bg-primary" : "border-muted-foreground/30"
                                    }`}
                            >
                                {selected && <Label className="text-xs text-primary-foreground">✓</Label>}
                            </View>
                            <Label className="text-sm">{opt.label}</Label>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <ScrollView className="flex-1 bg-background" contentContainerClassName="p-5 pb-24">
            {/* Header */}
            <View className="flex-row items-center gap-3 mb-1">
                {onBack && (
                    <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                        <MutedText className="text-2xl">‹</MutedText>
                    </TouchableOpacity>
                )}
                <Heading className="text-left text-2xl">Configure</Heading>
            </View>
            <Subtitle className="text-left mb-4">{templateTitle}</Subtitle>

            {/* .env Upload Zone */}
            <TouchableOpacity
                className="rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-6 mb-4 items-center"
                activeOpacity={0.7}
                onPress={handleEnvUpload}
            >
                <MutedText className="text-2xl mb-2">↑</MutedText>
                <Label className="text-sm">Import .env Configuration</Label>
                <MutedText className="text-xs text-center mt-1">
                    Tap to upload your .env file to auto-fill fields
                </MutedText>
            </TouchableOpacity>

            <View className="rounded-xl bg-card border border-border/30 overflow-hidden mb-3">
                <View className="p-4 border-b border-border/20">
                    <Label className="text-sm">Optional Scaffold Modules</Label>
                    <MutedText className="text-xs mt-1">
                        Keep the starter lean by default, then add heavier modules only when you want them in the ZIP.
                    </MutedText>
                </View>
                <View className="p-4 gap-3">
                    {SCAFFOLD_MODULE_OPTIONS.map((module) => {
                        const selected = formValues.SELECTED_MODULES.includes(module.value);
                        return (
                            <TouchableOpacity
                                key={module.value}
                                className={`rounded-xl border p-3 ${selected ? "border-primary bg-primary/10" : "border-border/30 bg-card"} ${module.disabled ? "opacity-50" : ""}`}
                                activeOpacity={0.8}
                                disabled={module.disabled}
                                onPress={() => toggleArrayField("SELECTED_MODULES", module.value)}
                            >
                                <View className="flex-row items-center justify-between gap-3">
                                    <Label className="text-sm">{module.label}</Label>
                                    <MutedText className="text-xs font-semibold text-primary">
                                        +{module.creditsCost} credits
                                    </MutedText>
                                </View>
                                <MutedText className="text-xs mt-1">{module.description}</MutedText>
                                <MutedText className="text-[11px] mt-2">
                                    {module.disabled ? "Coming soon" : selected ? "Selected" : "Optional"}
                                </MutedText>
                            </TouchableOpacity>
                        );
                    })}
                    <View className="rounded-lg bg-muted/40 px-3 py-3">
                        <MutedText className="text-xs">Base starter: {BASE_SCAFFOLD_CREDITS_COST} credits</MutedText>
                        <Label className="text-base mt-1">Total: {totalCreditsCost} credits</Label>
                    </View>
                </View>
            </View>

            {/* ── Project Settings ──────────────────────────────────────── */}
            {renderSection("project", "Project Settings", "📦", "text-blue-500", "Core settings for your application identity.", <>
                {renderField("Project Name *", "name", "my-saas-app")}
                {renderField("SaaS Name *", "NEXT_PUBLIC_SAAS_NAME", "My SaaS")}
                {renderField("Company Name *", "NEXT_PUBLIC_COMPANY_NAME", "Acme Inc.")}
                {renderField("Public URL *", "NEXT_PUBLIC_URL", "https://myapp.com")}

                {/* Theme Color */}
                <View>
                    <MutedText className="text-xs mb-2 font-medium">Theme Color *</MutedText>
                    <View className="flex-row flex-wrap gap-2">
                        {THEME_OPTIONS.map((theme) => (
                            <TouchableOpacity
                                key={theme.value}
                                className={`w-9 h-9 rounded-lg items-center justify-center border-2 ${formValues.NEXT_PUBLIC_THEME === theme.value
                                    ? "border-primary"
                                    : "border-transparent"
                                    }`}
                                style={{ backgroundColor: theme.color }}
                                activeOpacity={0.7}
                                onPress={() => updateField("NEXT_PUBLIC_THEME", theme.value)}
                            />
                        ))}
                    </View>
                </View>

                {/* Theme Type */}
                {renderSelect("Theme Mode *", "NEXT_PUBLIC_THEME_TYPE", THEME_TYPE_OPTIONS)}

                {/* Platform */}
                {renderMultiselect("Platform *", "NEXT_PUBLIC_PLATFORM", PLATFORM_OPTIONS)}
            </>)}

            {/* ── Landing / CMS Module ─────────────────────────────────── */}
            {renderSection("landing", "Landing Module", "📄", "text-purple-500", "Notion-backed CMS content.", <>
                {renderSelect("CMS *", "NEXT_PUBLIC_CMS", CMS_OPTIONS)}

                {formValues.NEXT_PUBLIC_CMS === "notion" && <>
                    {renderField("Landing Database ID *", "LANDING_DATABASE_ID", "Notion database ID")}
                    {renderField("Hero Database ID *", "HERO_DATABASE_ID", "Notion database ID")}
                    {renderField("Feature Database ID *", "FEATURE_DATABASE_ID", "Notion database ID")}
                    {renderField("Testimonial Database ID *", "TESTIMONIAL_DATABASE_ID", "Notion database ID")}
                    {renderField("Pricing Database ID *", "PRICING_DATABASE_ID", "Notion database ID")}
                    {renderField("FAQ Database ID *", "FAQ_DATABASE_ID", "Notion database ID")}
                    {renderField("Footer Database ID *", "FOOTER_DATABASE_ID", "Notion database ID")}
                    {renderField("Documentation Database ID *", "DOCUMENTATION_DATABASE_ID", "Notion database ID")}
                    {renderField("Notion API Token *", "NOTION_API_TOKEN", "secret_...", true)}
                </>}
                {(formValues.NEXT_PUBLIC_CMS === "notion" || formValues.NEXT_PUBLIC_CMS === "postgres") && <>
                    {renderField("Upstash Redis REST URL *", "UPSTASH_REDIS_REST_URL", "https://...")}
                    {renderField("Upstash Redis REST Token *", "UPSTASH_REDIS_REST_TOKEN", "AX...", true)}
                </>}
            </>)}

            {/* ── Authentication Module ────────────────────────────────── */}
            {renderSection("auth", "Authentication Module", "🔐", "text-amber-500", "BetterAuth & OAuth providers.", <>
                {renderSelect("Auth Framework *", "NEXT_PUBLIC_AUTH_FRAMEWORK", AUTH_FRAMEWORK_OPTIONS)}

                {formValues.NEXT_PUBLIC_AUTH_FRAMEWORK === "better-auth" &&
                    renderField("Better Auth Secret *", "BETTER_AUTH_SECRET", "Generate a random secret", true)
                }

                {renderMultiselect("Auth Providers *", "NEXT_PUBLIC_AUTH_PROVIDERS", AUTH_PROVIDER_OPTIONS)}

                {/* Email client - shown when email_verification is selected */}
                {formValues.NEXT_PUBLIC_AUTH_PROVIDERS.includes("email_verification") &&
                    renderSelect("Email Client *", "NEXT_PUBLIC_EMAIL_CLIENT", EMAIL_CLIENT_OPTIONS)
                }

                {/* Resend API key - shown when email client is resend */}
                {formValues.NEXT_PUBLIC_EMAIL_CLIENT === "resend" &&
                    renderField("Resend API Key *", "RESEND_API_KEY", "re_...", true)
                }

                {/* LinkedIn OAuth */}
                {formValues.NEXT_PUBLIC_AUTH_PROVIDERS.includes("linkedin") && <>
                    {renderField("LinkedIn Client ID *", "AUTH_LINKEDIN_CLIENT_ID", "LinkedIn OAuth client ID")}
                    {renderField("LinkedIn Client Secret *", "AUTH_LINKEDIN_CLIENT_SECRET", "LinkedIn OAuth client secret", true)}
                </>}

                {/* GitHub OAuth */}
                {formValues.NEXT_PUBLIC_AUTH_PROVIDERS.includes("github") && <>
                    {renderField("GitHub Client ID *", "AUTH_GITHUB_CLIENT_ID", "GitHub OAuth client ID")}
                    {renderField("GitHub Client Secret *", "AUTH_GITHUB_CLIENT_SECRET", "GitHub OAuth client secret", true)}
                </>}

                {/* Google OAuth */}
                {formValues.NEXT_PUBLIC_AUTH_PROVIDERS.includes("google") && <>
                    {renderField("Google Client ID *", "AUTH_GOOGLE_CLIENT_ID", "Google OAuth client ID")}
                    {renderField("Google Client Secret *", "AUTH_GOOGLE_CLIENT_SECRET", "Google OAuth client secret", true)}
                </>}
            </>)}

            {/* ── Support Module ───────────────────────────────────────── */}
            {renderSection("support", "Support Module", "🆘", "text-rose-500", "Support email and booking.", <>
                {renderMultiselect("Support Features", "NEXT_PUBLIC_SUPPORT_FEATURES", SUPPORT_FEATURE_OPTIONS)}

                {formValues.NEXT_PUBLIC_SUPPORT_FEATURES.includes("support_mail") && <>
                    {renderField("Support Email", "NEXT_PUBLIC_SUPPORT_MAIL", "support@example.com")}
                    {renderSelect("Email Client *", "NEXT_PUBLIC_EMAIL_CLIENT", EMAIL_CLIENT_OPTIONS)}
                    {formValues.NEXT_PUBLIC_EMAIL_CLIENT === "resend" &&
                        renderField("Resend API Key *", "RESEND_API_KEY", "re_...", true)
                    }
                </>}

                {formValues.NEXT_PUBLIC_SUPPORT_FEATURES.includes("calendly") &&
                    renderField("Calendly Booking URL", "NEXT_PUBLIC_CALENDLY_BOOKING_URL", "https://calendly.com/...")
                }
            </>)}

            {/* ── Storage Module ───────────────────────────────────────── */}
            {renderSection("storage", "Storage Module", "🗄️", "text-cyan-500", "Postgres, Redis, and Blob storage.", <>
                {renderSelect("Image Storage *", "NEXT_PUBLIC_IMAGE_STORAGE", IMAGE_STORAGE_OPTIONS)}

                {formValues.NEXT_PUBLIC_IMAGE_STORAGE === "vercel_blob" &&
                    renderField("Vercel Blob Token *", "BLOB_READ_WRITE_TOKEN", "vercel_blob_...", true)
                }

                {formValues.NEXT_PUBLIC_IMAGE_STORAGE === "cloudflare_r2" && <>
                    {renderField("R2 Account ID *", "R2_ACCOUNT_ID", "Cloudflare account ID")}
                    {renderField("R2 Access Key ID *", "R2_ACCESS_KEY_ID", "Access key ID")}
                    {renderField("R2 Secret Access Key *", "R2_SECRET_ACCESS_KEY", "Secret access key", true)}
                    {renderField("R2 Bucket Name *", "R2_BUCKET_NAME", "my-bucket")}
                    {renderField("R2 Public URL *", "NEXT_PUBLIC_R2_PUBLIC_URL", "https://...")}
                </>}

                {renderField("Database URL *", "DATABASE_URL", "postgresql://user:pass@host:5432/db", true)}
                <MutedText className="text-xs">
                    Providers: Neon (Free), Supabase (Free), AWS RDS (~$15/mo), Railway ($5/mo)
                </MutedText>
            </>)}

            {/* ── Observability Module ─────────────────────────────────── */}
            {renderSection("observability", "Observability, Analytics & Security", "📊", "text-orange-500", "Telemetry, analytics, and security.", <>
                {renderMultiselect("Features", "NEXT_PUBLIC_OBSERVABILITY_FEATURES", OBSERVABILITY_FEATURE_OPTIONS)}

                {formValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES.includes("logging") && <>
                    {renderField("BetterStack Source Token", "BETTERSTACK_TELEMETRY_SOURCE_TOKEN", "Source token", true)}
                    {renderField("BetterStack Ingesting Host", "BETTERSTACK_TELEMETRY_INGESTING_HOST", "Ingesting host")}
                </>}

                {formValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES.includes("google_analytics") &&
                    renderField("Google Analytics ID", "NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID", "G-XXXXXXXXXX")
                }

                {formValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES.includes("rate_limiting") && <>
                    {renderSelect("Rate Limit Provider *", "NEXT_PUBLIC_ALLOW_RATE_LIMIT", RATE_LIMIT_OPTIONS)}
                    {formValues.NEXT_PUBLIC_ALLOW_RATE_LIMIT === "upstash" && <>
                        {renderField("Upstash Redis REST URL *", "UPSTASH_REDIS_REST_URL", "https://...")}
                        {renderField("Upstash Redis REST Token *", "UPSTASH_REDIS_REST_TOKEN", "AX...", true)}
                    </>}
                </>}
            </>)}

            {/* ── Payment Module ───────────────────────────────────────── */}
            {selectedBilling && renderSection("payment", "Payment Module", "💳", "text-green-500", "Payment gateway configuration.", <>
                {renderSelect("Payment Gateway *", "NEXT_PUBLIC_PAYMENT_GATEWAY", PAYMENT_GATEWAY_OPTIONS)}

                {formValues.NEXT_PUBLIC_PAYMENT_GATEWAY === "dodo" && <>
                    {renderField("Dodo API Key *", "DODO_PAYMENTS_API_KEY", "API key", true)}
                    {renderField("Dodo Webhook Key *", "DODO_PAYMENTS_WEBHOOK_KEY", "Webhook key", true)}
                    {renderField("Dodo Return URL *", "DODO_PAYMENTS_RETURN_URL", "https://...")}
                    {renderSelect("Dodo Environment *", "DODO_PAYMENTS_ENVIRONMENT", DODO_ENV_OPTIONS)}
                    {renderField("Dodo Credits Product ID *", "DODO_CREDITS_PRODUCT_ID", "Product ID")}
                    {renderField("Dodo Payments URL *", "NEXT_PUBLIC_DODO_PAYMENTS_URL", "https://...")}
                </>}

                {formValues.NEXT_PUBLIC_PAYMENT_GATEWAY === "stripe" && <>
                    {renderField("Stripe Secret Key *", "STRIPE_SECRET_KEY", "sk_...", true)}
                    {renderField("Stripe Webhook Secret *", "STRIPE_WEBHOOK_SECRET", "whsec_...", true)}
                </>}
            </>)}

            {/* Download Button */}
            <View className="mt-4">
                <Button
                    label={isDownloading ? "Generating..." : "Download Boilerplate"}
                    onPress={handleDownload}
                    loading={isDownloading}
                    disabled={isDownloading || !formValues.name.trim()}
                />
            </View>
        </ScrollView>
    );
}
