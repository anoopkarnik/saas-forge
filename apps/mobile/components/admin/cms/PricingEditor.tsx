import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsArrayEditor from "./CmsArrayEditor";
import { Label, MutedText } from "@/components/common";
import type { LandingData } from "@/lib/cms-api";

type Plan = {
    id?: string;
    title: string;
    price: string;
    popular: boolean;
    description: string;
    priceType: string;
    benefitList: string;
};

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function PricingEditor({ data, onBack, onSave, isSaving }: Props) {
    const [pricingHeading, setPricingHeading] = useState("");
    const [pricingDescription, setPricingDescription] = useState("");
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setPricingHeading(data.pricingSection.heading || "");
            setPricingDescription(data.pricingSection.description || "");
            setPlans(
                (data.pricingSection.plans || []).map((p) => ({
                    ...p,
                    benefitList: Array.isArray(p.benefitList) ? p.benefitList.join(", ") : (p.benefitList || ""),
                }))
            );
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const updatePlan = (index: number, field: keyof Plan, value: string | boolean) => {
        setPlans((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({
            pricingHeading,
            pricingDescription,
            plans: plans.map((p) => ({
                ...p,
                benefitList: p.benefitList.split(",").map((b) => b.trim()).filter(Boolean),
            })),
        });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="Pricing"
            icon={"\uD83D\uDCB3"}
            description="Define your pricing tiers and what's included."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <CmsFormField label="Section Heading" value={pricingHeading} onChangeText={update(setPricingHeading)} placeholder="Simple pricing" />
            <CmsFormField label="Section Description" value={pricingDescription} onChangeText={update(setPricingDescription)} placeholder="Choose the plan that fits..." multiline numberOfLines={2} />

            <CmsArrayEditor
                title="Pricing Plans"
                items={plans}
                addLabel="Add Plan"
                emptyMessage="No pricing plans yet. Add one to get started."
                onAdd={() => { setPlans((prev) => [...prev, { title: "", price: "", popular: false, description: "", priceType: "", benefitList: "" }]); setIsDirty(true); }}
                onRemove={(i) => { setPlans((prev) => prev.filter((_, idx) => idx !== i)); setIsDirty(true); }}
                renderItem={(item, index) => (
                    <>
                        <CmsFormField label="Plan Title" value={item.title} onChangeText={(v) => updatePlan(index, "title", v)} />
                        <CmsFormField label="Price (e.g. $49)" value={item.price} onChangeText={(v) => updatePlan(index, "price", v)} />
                        <CmsFormField label="Frequency (e.g. /month)" value={item.priceType} onChangeText={(v) => updatePlan(index, "priceType", v)} />

                        <TouchableOpacity
                            className={`flex-row items-center justify-between p-3 rounded-lg border mb-4 ${
                                item.popular ? "bg-primary/10 border-primary/30" : "bg-sidebar/50 border-border/30"
                            }`}
                            activeOpacity={0.7}
                            onPress={() => updatePlan(index, "popular", !item.popular)}
                        >
                            <View>
                                <Label className="text-xs">Popular Plan</Label>
                                <MutedText className="text-[10px]">Highlight this plan with a badge</MutedText>
                            </View>
                            <View className={`w-10 h-6 rounded-full justify-center ${item.popular ? "bg-primary items-end" : "bg-muted items-start"}`}>
                                <View className="w-5 h-5 rounded-full bg-white mx-0.5" />
                            </View>
                        </TouchableOpacity>

                        <CmsFormField label="Description" value={item.description} onChangeText={(v) => updatePlan(index, "description", v)} multiline numberOfLines={2} />
                        <CmsFormField label="Benefits (comma-separated)" value={item.benefitList} onChangeText={(v) => updatePlan(index, "benefitList", v)} placeholder="Feature A, Feature B" multiline numberOfLines={2} />
                    </>
                )}
            />
        </CmsSectionWrapper>
    );
}
