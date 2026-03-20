import React, { useState, useEffect } from "react";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsImageField from "./CmsImageField";
import CmsArrayEditor from "./CmsArrayEditor";
import type { LandingData } from "@/lib/cms-api";

type Testimonial = {
    id?: string;
    name: string;
    position: string;
    comment: string;
    imageUrl: string;
    category?: string;
};

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function TestimonialsEditor({ data, onBack, onSave, isSaving }: Props) {
    const [testimonialHeading, setTestimonialHeading] = useState("");
    const [testimonialDescription, setTestimonialDescription] = useState("");
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setTestimonialHeading(data.testimonialSection.heading || "");
            setTestimonialDescription(data.testimonialSection.description || "");
            setTestimonials(
                (data.testimonialSection.testimonials || []).map((t) => ({
                    ...t,
                    category: t.category || "",
                }))
            );
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const updateTestimonial = (index: number, field: keyof Testimonial, value: string) => {
        setTestimonials((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({
            testimonialHeading,
            testimonialDescription,
            testimonials: testimonials.map((t) => ({ ...t, category: t.category || undefined })),
        });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="Testimonials"
            icon={"\uD83D\uDCAC"}
            description="Social proof from your happiest customers."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <CmsFormField label="Section Heading" value={testimonialHeading} onChangeText={update(setTestimonialHeading)} placeholder="What people say" />
            <CmsFormField label="Section Description" value={testimonialDescription} onChangeText={update(setTestimonialDescription)} placeholder="Hear from our users..." multiline numberOfLines={2} />

            <CmsArrayEditor
                title="Testimonial Items"
                items={testimonials}
                addLabel="Add Testimonial"
                emptyMessage="No testimonials yet. Add one to get started."
                onAdd={() => { setTestimonials((prev) => [...prev, { name: "", position: "", comment: "", category: "", imageUrl: "" }]); setIsDirty(true); }}
                onRemove={(i) => { setTestimonials((prev) => prev.filter((_, idx) => idx !== i)); setIsDirty(true); }}
                renderItem={(item, index) => (
                    <>
                        <CmsFormField label="Author Name" value={item.name} onChangeText={(v) => updateTestimonial(index, "name", v)} />
                        <CmsFormField label="Job Title / Role" value={item.position} onChangeText={(v) => updateTestimonial(index, "position", v)} />
                        <CmsFormField label="Category" value={item.category || ""} onChangeText={(v) => updateTestimonial(index, "category", v)} />
                        <CmsImageField label="Avatar" value={item.imageUrl} onChangeText={(v) => updateTestimonial(index, "imageUrl", v)} />
                        <CmsFormField label="Quote" value={item.comment} onChangeText={(v) => updateTestimonial(index, "comment", v)} multiline numberOfLines={3} />
                    </>
                )}
            />
        </CmsSectionWrapper>
    );
}
