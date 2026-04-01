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

// ─── Theme colors (matches web themeColors) ────────────────────────────
const THEME_OPTIONS = [
    { value: "blue", label: "Blue", color: "#3b82f6" },
    { value: "green", label: "Green", color: "#22c55e" },
    { value: "neutral", label: "Neutral", color: "#737373" },
    { value: "orange", label: "Orange", color: "#f97316" },
    { value: "red", label: "Red", color: "#ef4444" },
    { value: "rose", label: "Rose", color: "#f43f5e" },
    { value: "violet", label: "Violet", color: "#8b5cf6" },
    { value: "yellow", label: "Yellow", color: "#eab308" },
];

// ─── Theme type options ────────────────────────────────────────────────
const THEME_TYPE_OPTIONS = [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
];

// ─── Platform options ──────────────────────────────────────────────────
const PLATFORM_OPTIONS = [
    { value: "web", label: "Web App (Compulsory)", disabled: true },
    { value: "mobile", label: "Mobile App", disabled: false },
    { value: "desktop", label: "Desktop App", disabled: false },
];

// ─── CMS options ───────────────────────────────────────────────────────
const CMS_OPTIONS = [
    { value: "constant", label: "Constant" },
    { value: "postgres", label: "Postgres" },
    { value: "notion", label: "Notion" },
    { value: "strapi", label: "Strapi (Coming Soon)", disabled: true },
];

// ─── Auth framework options ────────────────────────────────────────────
const AUTH_FRAMEWORK_OPTIONS = [
    { value: "better-auth", label: "Better Auth" },
];

// ─── Auth provider options ─────────────────────────────────────────────
const AUTH_PROVIDER_OPTIONS = [
    { value: "email_verification", label: "Email Verification" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "google", label: "Google" },
    { value: "github", label: "GitHub" },
];

// ─── Email client options ──────────────────────────────────────────────
const EMAIL_CLIENT_OPTIONS = [
    { value: "none", label: "None" },
    { value: "resend", label: "Resend (Free: 100 emails/day)" },
    { value: "gmail_smtp", label: "Gmail SMTP (Coming Soon)", disabled: true },
];

// ─── Support feature options ───────────────────────────────────────────
const SUPPORT_FEATURE_OPTIONS = [
    { value: "support_mail", label: "Send Support Mail" },
    { value: "calendly", label: "Book Meeting" },
];

// ─── Image storage options ─────────────────────────────────────────────
const IMAGE_STORAGE_OPTIONS = [
    { value: "vercel_blob", label: "Vercel Blob (Free 1GB)" },
    { value: "cloudflare_r2", label: "Cloudflare R2 (Free 100GB)" },
];

// ─── Observability feature options ─────────────────────────────────────
const OBSERVABILITY_FEATURE_OPTIONS = [
    { value: "logging", label: "Logging" },
    { value: "google_analytics", label: "Google Analytics" },
    { value: "rate_limiting", label: "Rate Limiting" },
];

// ─── Rate limit provider options ───────────────────────────────────────
const RATE_LIMIT_OPTIONS = [
    { value: "upstash", label: "Upstash" },
];

// ─── Payment gateway options ───────────────────────────────────────────
const PAYMENT_GATEWAY_OPTIONS = [
    { value: "none", label: "None" },
    { value: "dodo", label: "Dodo Payments" },
    { value: "stripe", label: "Stripe" },
];

// ─── Dodo environment options ──────────────────────────────────────────
const DODO_ENV_OPTIONS = [
    { value: "test_mode", label: "Test Mode" },
    { value: "live_mode", label: "Live Mode" },
];

// ─── Form state type ──────────────────────────────────────────────────
type FormState = {
    name: string;
    // Project
    NEXT_PUBLIC_THEME: string;
    NEXT_PUBLIC_THEME_TYPE: string;
    NEXT_PUBLIC_PLATFORM: string[];
    NEXT_PUBLIC_SAAS_NAME: string;
    NEXT_PUBLIC_COMPANY_NAME: string;
    NEXT_PUBLIC_URL: string;
    // Landing / CMS
    NEXT_PUBLIC_CMS: string;
    LANDING_DATABASE_ID: string;
    HERO_DATABASE_ID: string;
    FEATURE_DATABASE_ID: string;
    TESTIMONIAL_DATABASE_ID: string;
    PRICING_DATABASE_ID: string;
    FAQ_DATABASE_ID: string;
    FOOTER_DATABASE_ID: string;
    DOCUMENTATION_DATABASE_ID: string;
    NOTION_API_TOKEN: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    // Auth
    NEXT_PUBLIC_AUTH_FRAMEWORK: string;
    BETTER_AUTH_SECRET: string;
    NEXT_PUBLIC_AUTH_PROVIDERS: string[];
    NEXT_PUBLIC_EMAIL_CLIENT: string;
    RESEND_API_KEY: string;
    AUTH_LINKEDIN_CLIENT_ID: string;
    AUTH_LINKEDIN_CLIENT_SECRET: string;
    AUTH_GITHUB_CLIENT_ID: string;
    AUTH_GITHUB_CLIENT_SECRET: string;
    AUTH_GOOGLE_CLIENT_ID: string;
    AUTH_GOOGLE_CLIENT_SECRET: string;
    // Support
    NEXT_PUBLIC_SUPPORT_FEATURES: string[];
    NEXT_PUBLIC_SUPPORT_MAIL: string;
    NEXT_PUBLIC_CALENDLY_BOOKING_URL: string;
    // Storage
    NEXT_PUBLIC_IMAGE_STORAGE: string;
    BLOB_READ_WRITE_TOKEN: string;
    R2_ACCOUNT_ID: string;
    R2_ACCESS_KEY_ID: string;
    R2_SECRET_ACCESS_KEY: string;
    R2_BUCKET_NAME: string;
    NEXT_PUBLIC_R2_PUBLIC_URL: string;
    DATABASE_URL: string;
    // Observability
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: string[];
    BETTERSTACK_TELEMETRY_SOURCE_TOKEN: string;
    BETTERSTACK_TELEMETRY_INGESTING_HOST: string;
    NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: string;
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: string;
    // Payment
    NEXT_PUBLIC_PAYMENT_GATEWAY: string;
    DODO_PAYMENTS_API_KEY: string;
    DODO_PAYMENTS_WEBHOOK_KEY: string;
    DODO_PAYMENTS_RETURN_URL: string;
    DODO_PAYMENTS_ENVIRONMENT: string;
    DODO_CREDITS_PRODUCT_ID: string;
    NEXT_PUBLIC_DODO_PAYMENTS_URL: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
};

const DEFAULT_FORM: FormState = {
    name: "",
    NEXT_PUBLIC_THEME: "neutral",
    NEXT_PUBLIC_THEME_TYPE: "system",
    NEXT_PUBLIC_PLATFORM: ["web"],
    NEXT_PUBLIC_SAAS_NAME: "",
    NEXT_PUBLIC_COMPANY_NAME: "",
    NEXT_PUBLIC_URL: "",
    NEXT_PUBLIC_CMS: "notion",
    LANDING_DATABASE_ID: "",
    HERO_DATABASE_ID: "",
    FEATURE_DATABASE_ID: "",
    TESTIMONIAL_DATABASE_ID: "",
    PRICING_DATABASE_ID: "",
    FAQ_DATABASE_ID: "",
    FOOTER_DATABASE_ID: "",
    DOCUMENTATION_DATABASE_ID: "",
    NOTION_API_TOKEN: "",
    UPSTASH_REDIS_REST_URL: "",
    UPSTASH_REDIS_REST_TOKEN: "",
    NEXT_PUBLIC_AUTH_FRAMEWORK: "better-auth",
    BETTER_AUTH_SECRET: "",
    NEXT_PUBLIC_AUTH_PROVIDERS: [],
    NEXT_PUBLIC_EMAIL_CLIENT: "none",
    RESEND_API_KEY: "",
    AUTH_LINKEDIN_CLIENT_ID: "",
    AUTH_LINKEDIN_CLIENT_SECRET: "",
    AUTH_GITHUB_CLIENT_ID: "",
    AUTH_GITHUB_CLIENT_SECRET: "",
    AUTH_GOOGLE_CLIENT_ID: "",
    AUTH_GOOGLE_CLIENT_SECRET: "",
    NEXT_PUBLIC_SUPPORT_FEATURES: [],
    NEXT_PUBLIC_SUPPORT_MAIL: "",
    NEXT_PUBLIC_CALENDLY_BOOKING_URL: "",
    NEXT_PUBLIC_IMAGE_STORAGE: "vercel_blob",
    BLOB_READ_WRITE_TOKEN: "",
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET_NAME: "",
    NEXT_PUBLIC_R2_PUBLIC_URL: "",
    DATABASE_URL: "",
    NEXT_PUBLIC_OBSERVABILITY_FEATURES: [],
    BETTERSTACK_TELEMETRY_SOURCE_TOKEN: "",
    BETTERSTACK_TELEMETRY_INGESTING_HOST: "",
    NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: "",
    NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
    NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
    DODO_PAYMENTS_API_KEY: "",
    DODO_PAYMENTS_WEBHOOK_KEY: "",
    DODO_PAYMENTS_RETURN_URL: "",
    DODO_PAYMENTS_ENVIRONMENT: "",
    DODO_CREDITS_PRODUCT_ID: "",
    NEXT_PUBLIC_DODO_PAYMENTS_URL: "",
    STRIPE_SECRET_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
};

// All string field keys for env var mapping
const STRING_FIELD_KEYS = Object.keys(DEFAULT_FORM).filter(
    (k) =>
        k !== "name" &&
        !Array.isArray(DEFAULT_FORM[k as keyof FormState])
) as (keyof FormState)[];

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

    const toggleSection = (section: string) => {
        setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
    };

    const updateField = (key: keyof FormState, value: string) => {
        setFormValues((prev) => ({ ...prev, [key]: value }));
    };

    const toggleArrayField = (key: keyof FormState, value: string) => {
        setFormValues((prev) => {
            const arr = prev[key] as string[];
            return {
                ...prev,
                [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
            };
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

            const lines = content.split("\n");
            let count = 0;
            const parsedEnv: Record<string, string> = {};

            lines.forEach((line: string) => {
                if (line.startsWith("#") || !line.trim()) return;
                const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
                if (match) {
                    const key = match[1];
                    const rawValue = match[2];
                    if (!key || rawValue === undefined) return;
                    let value = rawValue.trim();
                    if (
                        (value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))
                    ) {
                        value = value.slice(1, -1);
                    }
                    parsedEnv[key] = value;
                }
            });

            const newValues = { ...formValues };

            // Set string fields
            Object.keys(parsedEnv).forEach((key) => {
                if (
                    key in DEFAULT_FORM &&
                    !Array.isArray(DEFAULT_FORM[key as keyof FormState]) &&
                    key !== "name" &&
                    key !== "NEXT_PUBLIC_AUTH_PROVIDERS" &&
                    key !== "NEXT_PUBLIC_OBSERVABILITY_FEATURES" &&
                    key !== "NEXT_PUBLIC_SUPPORT_FEATURES" &&
                    key !== "NEXT_PUBLIC_PLATFORM"
                ) {
                    (newValues as any)[key] = parsedEnv[key];
                    count++;
                }
            });

            // Auth providers from boolean flags
            const providers: string[] = [];
            if (parsedEnv["NEXT_PUBLIC_AUTH_EMAIL"] === "true") providers.push("email_verification");
            if (parsedEnv["NEXT_PUBLIC_AUTH_GOOGLE"] === "true") providers.push("google");
            if (parsedEnv["NEXT_PUBLIC_AUTH_GITHUB"] === "true") providers.push("github");
            if (parsedEnv["NEXT_PUBLIC_AUTH_LINKEDIN"] === "true") providers.push("linkedin");
            if (providers.length > 0) {
                newValues.NEXT_PUBLIC_AUTH_PROVIDERS = providers;
                count += providers.length;
            }

            // Comma-separated array fields
            if (parsedEnv["NEXT_PUBLIC_OBSERVABILITY_FEATURES"]) {
                newValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES = parsedEnv["NEXT_PUBLIC_OBSERVABILITY_FEATURES"]
                    .split(",").map((f) => f.trim()).filter(Boolean);
                count++;
            }
            if (parsedEnv["NEXT_PUBLIC_SUPPORT_FEATURES"]) {
                newValues.NEXT_PUBLIC_SUPPORT_FEATURES = parsedEnv["NEXT_PUBLIC_SUPPORT_FEATURES"]
                    .split(",").map((f) => f.trim()).filter(Boolean);
                count++;
            }
            if (parsedEnv["NEXT_PUBLIC_PLATFORM"]) {
                newValues.NEXT_PUBLIC_PLATFORM = parsedEnv["NEXT_PUBLIC_PLATFORM"]
                    .split(",").map((f) => f.trim()).filter(Boolean);
                count++;
            }

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

            if (Platform.OS === "web") {
                // Web: use native browser download (credentials needed for auth cookies)
                const response = await fetch(`${apiUrl}/api/scaffold`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ name: safeName, envVars }),
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
                    body: JSON.stringify({ name: safeName, envVars }),
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
            {renderSection("payment", "Payment Module", "💳", "text-green-500", "Payment gateway configuration.", <>
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
