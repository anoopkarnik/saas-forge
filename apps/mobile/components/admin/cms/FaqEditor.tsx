import React, { useState, useEffect } from "react";
import CmsSectionWrapper from "./CmsSectionWrapper";
import CmsFormField from "./CmsFormField";
import CmsArrayEditor from "./CmsArrayEditor";
import type { LandingData } from "@/lib/cms-api";

type Faq = { id?: string; question: string; answer: string };

type Props = {
    data: LandingData | null;
    onBack: () => void;
    onSave: (values: Record<string, any>) => Promise<void>;
    isSaving: boolean;
};

export default function FaqEditor({ data, onBack, onSave, isSaving }: Props) {
    const [faqHeading, setFaqHeading] = useState("");
    const [faqDescription, setFaqDescription] = useState("");
    const [faqs, setFaqs] = useState<Faq[]>([]);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (data) {
            setFaqHeading(data.faqSection.heading || "");
            setFaqDescription(data.faqSection.description || "");
            setFaqs(data.faqSection.faqs || []);
        }
    }, [data]);

    const update = (setter: (v: string) => void) => (v: string) => {
        setter(v);
        setIsDirty(true);
    };

    const updateFaq = (index: number, field: keyof Faq, value: string) => {
        setFaqs((prev) => prev.map((f, i) => (i === index ? { ...f, [field]: value } : f)));
        setIsDirty(true);
    };

    const handleSave = async () => {
        await onSave({ faqHeading, faqDescription, faqs });
        setIsDirty(false);
    };

    return (
        <CmsSectionWrapper
            title="FAQ"
            icon={"\u2753"}
            description="Answer common questions to reduce support load."
            onBack={onBack}
            onSave={handleSave}
            isSaving={isSaving}
            isDirty={isDirty}
        >
            <CmsFormField label="Section Heading" value={faqHeading} onChangeText={update(setFaqHeading)} placeholder="Frequently asked questions" />
            <CmsFormField label="Section Description" value={faqDescription} onChangeText={update(setFaqDescription)} placeholder="Got questions? We have answers." multiline numberOfLines={2} />

            <CmsArrayEditor
                title="FAQ Items"
                items={faqs}
                addLabel="Add FAQ"
                emptyMessage="No FAQs yet. Add one to get started."
                onAdd={() => { setFaqs((prev) => [...prev, { question: "", answer: "" }]); setIsDirty(true); }}
                onRemove={(i) => { setFaqs((prev) => prev.filter((_, idx) => idx !== i)); setIsDirty(true); }}
                renderItem={(item, index) => (
                    <>
                        <CmsFormField label="Question" value={item.question} onChangeText={(v) => updateFaq(index, "question", v)} />
                        <CmsFormField label="Answer" value={item.answer} onChangeText={(v) => updateFaq(index, "answer", v)} multiline numberOfLines={3} />
                    </>
                )}
            />
        </CmsSectionWrapper>
    );
}
