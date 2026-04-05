import React, { useState, useEffect } from "react";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsImageField from "./CmsImageField";
import CmsArrayEditor from "./CmsArrayEditor";
import type { LandingData } from "@/lib/cms-api";

type HeroImage = { id?: string; title: string; imageUrl: string };

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function HeroEditor({ data, onBack, onSave, isSaving }: Props) {
    const [tagline, setTagline] = useState("");
    const [description, setDescription] = useState("");
    const [appointmentLink, setAppointmentLink] = useState("");
    const [videoLink, setVideoLink] = useState("");
    const [codeSnippet, setCodeSnippet] = useState("");
    const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setTagline(data.heroSection.tagline || "");
            setDescription(data.heroSection.description || "");
            setAppointmentLink(data.heroSection.appointmentLink || "");
            setVideoLink(data.heroSection.videoLink || "");
            setCodeSnippet(data.heroSection.codeSnippet || "");
            setHeroImages(data.heroSection.heroImages || []);
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const updateImage = (index: number, field: keyof HeroImage, value: string) => {
        setHeroImages((prev) => prev.map((img, i) => (i === index ? { ...img, [field]: value } : img)));
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({ tagline, description, appointmentLink, videoLink, codeSnippet, heroImages });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="Hero"
            icon={"\uD83C\uDFE0"}
            description="The first thing visitors see. Make it count."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <CmsFormField label="Tagline" value={tagline} onChangeText={update(setTagline)} placeholder="Your bold headline..." multiline numberOfLines={2} />
            <CmsFormField label="Description" value={description} onChangeText={update(setDescription)} placeholder="A brief description..." multiline numberOfLines={3} />
            <CmsFormField label="Appointment / Calendar Link" value={appointmentLink} onChangeText={update(setAppointmentLink)} placeholder="https://cal.com/..." />
            <CmsFormField label="Video Link (YouTube)" value={videoLink} onChangeText={update(setVideoLink)} placeholder="https://youtube.com/..." />
            <CmsFormField label="Hero Code Snippet" value={codeSnippet} onChangeText={update(setCodeSnippet)} placeholder="npx create-my-app@latest" />

            <CmsArrayEditor
                title="Hero Carousel Images"
                items={heroImages}
                addLabel="Add Image"
                emptyMessage="No hero images yet. Add one to get started."
                onAdd={() => { setHeroImages((prev) => [...prev, { title: "", imageUrl: "" }]); setIsDirty(true); }}
                onRemove={(i) => { setHeroImages((prev) => prev.filter((_, idx) => idx !== i)); setIsDirty(true); }}
                renderItem={(item, index) => (
                    <>
                        <CmsFormField label="Image Alt/Title" value={item.title} onChangeText={(v) => updateImage(index, "title", v)} placeholder="Alt text" />
                        <CmsImageField label="Image" value={item.imageUrl} onChangeText={(v) => updateImage(index, "imageUrl", v)} />
                    </>
                )}
            />
        </CmsSectionWrapper>
    );
}
