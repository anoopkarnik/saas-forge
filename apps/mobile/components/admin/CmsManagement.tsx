import { useState, useEffect, useCallback } from "react";
import {
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Platform,
} from "react-native";
import { Heading, Subtitle, Label, MutedText } from "@/components/common";
import { fetchLandingData, updateLandingData, type LandingData } from "@/lib/cms-api";
import NavbarEditor from "./cms/NavbarEditor";
import HeroEditor from "./cms/HeroEditor";
import FeaturesEditor from "./cms/FeaturesEditor";
import TestimonialsEditor from "./cms/TestimonialsEditor";
import PricingEditor from "./cms/PricingEditor";
import FaqEditor from "./cms/FaqEditor";
import LegalEditor from "./cms/LegalEditor";

type Props = {
    onBack: () => void;
};

type SectionKey = "menu" | "navbar" | "hero" | "features" | "testimonials" | "pricing" | "faq" | "legal";

const cmsCategories: Array<{ key: SectionKey; title: string; description: string; icon: string }> = [
    { key: "navbar", title: "Navbar", description: "Navigation bar links and branding", icon: "\uD83E\uDDED" },
    { key: "hero", title: "Hero", description: "Hero section headline and CTA", icon: "\uD83C\uDFE0" },
    { key: "features", title: "Features", description: "Feature highlights and descriptions", icon: "\u2728" },
    { key: "testimonials", title: "Testimonials", description: "User testimonials and quotes", icon: "\uD83D\uDCAC" },
    { key: "pricing", title: "Pricing", description: "Pricing plans and tiers", icon: "\uD83D\uDCB3" },
    { key: "faq", title: "FAQ", description: "Frequently asked questions", icon: "\u2753" },
    { key: "legal", title: "Legal & Footer", description: "Legal links and footer content", icon: "\uD83D\uDEE1\uFE0F" },
];

export default function CmsManagement({ onBack }: Props) {
    const [activeSection, setActiveSection] = useState<SectionKey>("menu");
    const [landingData, setLandingData] = useState<LandingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);

    const showAlert = (title: string, message: string) => {
        if (Platform.OS === "web") {
            window.alert(`${title}: ${message}`);
        } else {
            const { Alert: NativeAlert } = require("react-native");
            NativeAlert.alert(title, message);
        }
    };

    const loadData = useCallback(async () => {
        try {
            const data = await fetchLandingData();
            setLandingData(data);
        } catch (e: any) {
            showAlert("Error", e.message || "Failed to load CMS data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleSave = async (values: Record<string, any>) => {
        setSaving(true);
        try {
            await updateLandingData(values);
            showAlert("Success", "CMS updated successfully! Changes synced to Notion.");
            await loadData();
        } catch (e: any) {
            showAlert("Error", e.message || "Failed to update CMS");
        } finally {
            setSaving(false);
        }
    };

    const editorProps = {
        data: landingData,
        onBack: () => setActiveSection("menu"),
        onSave: handleSave,
        isSaving: saving,
    };

    if (activeSection === "navbar") return <NavbarEditor {...editorProps} />;
    if (activeSection === "hero") return <HeroEditor {...editorProps} />;
    if (activeSection === "features") return <FeaturesEditor {...editorProps} />;
    if (activeSection === "testimonials") return <TestimonialsEditor {...editorProps} />;
    if (activeSection === "pricing") return <PricingEditor {...editorProps} />;
    if (activeSection === "faq") return <FaqEditor {...editorProps} />;
    if (activeSection === "legal") return <LegalEditor {...editorProps} />;

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator size="large" />
                <MutedText className="text-xs mt-3">Loading CMS data...</MutedText>
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="p-5 pb-24"
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="hsl(142, 81%, 71%)" />
            }
        >
            <View className="flex-row items-center gap-3 mb-1">
                <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
                    <MutedText className="text-2xl">{"\u2039"}</MutedText>
                </TouchableOpacity>
                <Heading className="text-left text-2xl">Content Management</Heading>
            </View>
            <Subtitle className="text-left mb-6">
                Update your landing page content. Changes sync to Notion.
            </Subtitle>

            <MutedText className="text-xs uppercase tracking-wider mb-3 font-medium">
                Content Sections
            </MutedText>
            <View className="gap-2">
                {cmsCategories.map((category) => (
                    <TouchableOpacity
                        key={category.key}
                        className="flex-row items-center gap-3 p-4 rounded-xl bg-card border border-border/30"
                        activeOpacity={0.7}
                        onPress={() => setActiveSection(category.key)}
                    >
                        <MutedText className="text-xl">{category.icon}</MutedText>
                        <View className="flex-1">
                            <Label className="text-sm">{category.title}</Label>
                            <MutedText className="text-xs mt-0.5">{category.description}</MutedText>
                        </View>
                        <MutedText className="text-lg">{"\u203A"}</MutedText>
                    </TouchableOpacity>
                ))}
            </View>
        </ScrollView>
    );
}
