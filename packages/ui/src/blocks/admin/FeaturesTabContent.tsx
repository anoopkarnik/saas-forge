"use client";

import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Button } from "@workspace/ui/components/shadcn/button";
import { AIFillPromptDialog } from "@workspace/ui/components/admin/AIFillPromptDialog";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@workspace/ui/components/admin/SectionHeader";
import { FeatureContentEditor } from "@workspace/ui/components/admin/FeatureContentEditor";
import { featuresFormSchema, type FeaturesFormValues, type SectionTabProps } from "@workspace/ui/lib/zod/cms";

export function FeaturesTabContent({ initialData, onSave, isSaving, uploadUrl, aiDraft, isAiFilling, onAIFill }: SectionTabProps) {
    const form = useForm<FeaturesFormValues>({
        resolver: zodResolver(featuresFormSchema),
        defaultValues: {
            featureHeading: "", featureDescription: "", featureGroups: [], features: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                featureHeading: initialData.featureSection.heading || "",
                featureDescription: initialData.featureSection.description || "",
                featureGroups: initialData.featureSection.groups || [],
                features: (initialData.featureSection.features || []).map((f: any) => ({
                    ...f, category: f.category || "",
                })),
            });
        }
    }, [initialData, form]);

    useEffect(() => {
        if (aiDraft?.section !== "features") return;

        Object.entries(aiDraft.values).forEach(([key, value]) => {
            form.setValue(key as keyof FeaturesFormValues, value as never, {
                shouldDirty: true,
                shouldTouch: true,
            });
        });
    }, [aiDraft?.nonce, aiDraft?.section, aiDraft?.values, form]);

    const features = useWatch({ control: form.control, name: "features" }) ?? [];
    const groups = useWatch({ control: form.control, name: "featureGroups" }) ?? [];
    const validation = featuresFormSchema.safeParse(form.getValues());

    const onSubmit = (values: FeaturesFormValues) => {
        const payload = {
            ...values,
            features: values.features?.map((f, sortOrder) => ({ ...f, category: f.category || undefined, sortOrder })),
        };
        onSave(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={Sparkles} title="Features Section" description="Showcase what makes your product special." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="featureHeading" render={({ field }) => (
                        <FormItem><FormLabel>Section Heading</FormLabel><FormControl><Input placeholder="Why choose us?" {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="featureDescription" render={({ field }) => (
                        <FormItem><FormLabel>Section Description</FormLabel><FormControl><Textarea rows={2} placeholder="A brief overview..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <FeatureContentEditor
                    features={features}
                    groups={groups}
                    uploadUrl={uploadUrl}
                    onFeaturesChange={value => form.setValue("features", value, { shouldDirty: true, shouldValidate: true })}
                    onGroupsChange={value => form.setValue("featureGroups", value, { shouldDirty: true, shouldValidate: true })}
                />
                {!validation.success && form.formState.isDirty && (
                    <div role="alert" className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive">
                        <p className="font-medium">Please fix these fields before saving:</p>
                        <ul className="mt-2 list-disc pl-5">{validation.error.issues.map((issue, index) => <li key={index}>{issue.path.join(" → ")}: {issue.message}</li>)}</ul>
                    </div>
                )}

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <div className="flex items-center gap-2">
                        {onAIFill && <AIFillPromptDialog isPending={Boolean(isAiFilling)} onFill={(instruction) => onAIFill("features", form.getValues(), instruction)} buttonSize="sm" />}
                        <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Features</>}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
