"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Sparkles, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ArrayEditor } from "@/components/admin/ArrayEditor";
import { featuresFormSchema, type FeaturesFormValues, type SectionTabProps } from "@/lib/zod/cms";

export function FeaturesTabContent({ initialData, onSave, isSaving }: SectionTabProps) {
    const form = useForm<FeaturesFormValues>({
        resolver: zodResolver(featuresFormSchema),
        defaultValues: {
            featureHeading: "", featureDescription: "", features: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                featureHeading: initialData.featureSection.heading || "",
                featureDescription: initialData.featureSection.description || "",
                features: (initialData.featureSection.features || []).map((f: any) => ({
                    ...f, category: f.category || "",
                })),
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: FeaturesFormValues) => {
        const payload = {
            ...values,
            features: values.features?.map(f => ({ ...f, category: f.category || undefined })),
        };
        onSave(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={Sparkles} title="Features Section" description="Showcase what makes your product special." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="featureHeading" render={({ field }) => (
                        <FormItem><FormLabel>Section Heading</FormLabel><FormControl><Input placeholder="Why choose us?" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="featureDescription" render={({ field }) => (
                        <FormItem><FormLabel>Section Description</FormLabel><FormControl><Textarea rows={2} placeholder="A brief overview..." {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <ArrayEditor
                    form={form}
                    name="features"
                    title="Feature Items"
                    addLabel="Add Feature"
                    emptyMessage="No features yet. Add one to get started."
                    defaultItem={{ title: "", description: "", category: "", imageUrl: "" }}
                    renderFields={(index) => (
                        <>
                            <FormField control={form.control} name={`features.${index}.title`} render={({ field }) => (
                                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`features.${index}.category`} render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`features.${index}.imageUrl`} render={({ field }) => (
                                <FormItem><FormLabel>Image URL</FormLabel><FormControl><ImageUploadField value={field.value ?? ""} onChange={field.onChange} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`features.${index}.description`} render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...(field as any)} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                />

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Features</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
