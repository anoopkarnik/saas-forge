import React, { useState, useEffect } from "react";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsImageField from "./CmsImageField";
import CmsArrayEditor from "./CmsArrayEditor";
import type { LandingData } from "@/lib/cms-api";

type Feature = { id?: string; title: string; description: string; category?: string; imageUrl: string };

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function FeaturesEditor({ data, onBack, onSave, isSaving }: Props) {
    const [featureHeading, setFeatureHeading] = useState("");
    const [featureDescription, setFeatureDescription] = useState("");
    const [features, setFeatures] = useState<Feature[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setFeatureHeading(data.featureSection.heading || "");
            setFeatureDescription(data.featureSection.description || "");
            setFeatures(
                (data.featureSection.features || []).map((f) => ({
                    ...f,
                    category: f.category || "",
                }))
            );
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const updateFeature = (index: number, field: keyof Feature, value: string) => {
        setFeatures((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({
            featureHeading,
            featureDescription,
            features: features.map((f) => ({ ...f, category: f.category || undefined })),
        });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="Features"
            icon={"\u2728"}
            description="Showcase what makes your product special."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <CmsFormField label="Section Heading" value={featureHeading} onChangeText={update(setFeatureHeading)} placeholder="Why choose us?" />
            <CmsFormField label="Section Description" value={featureDescription} onChangeText={update(setFeatureDescription)} placeholder="A brief overview..." multiline numberOfLines={2} />

            <CmsArrayEditor
                title="Feature Items"
                items={features}
                addLabel="Add Feature"
                emptyMessage="No features yet. Add one to get started."
                onAdd={() => { setFeatures((prev) => [...prev, { title: "", description: "", category: "", imageUrl: "" }]); setIsDirty(true); }}
                onRemove={(i) => { setFeatures((prev) => prev.filter((_, idx) => idx !== i)); setIsDirty(true); }}
                renderItem={(item, index) => (
                    <>
                        <CmsFormField label="Title" value={item.title} onChangeText={(v) => updateFeature(index, "title", v)} />
                        <CmsFormField label="Category" value={item.category || ""} onChangeText={(v) => updateFeature(index, "category", v)} />
                        <CmsImageField label="Image" value={item.imageUrl} onChangeText={(v) => updateFeature(index, "imageUrl", v)} />
                        <CmsFormField label="Description" value={item.description} onChangeText={(v) => updateFeature(index, "description", v)} multiline numberOfLines={2} />
                    </>
                )}
            />
        </CmsSectionWrapper>
    );
}
