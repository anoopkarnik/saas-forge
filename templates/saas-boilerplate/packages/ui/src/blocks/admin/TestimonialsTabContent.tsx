"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Button } from "@workspace/ui/components/shadcn/button";
import { MessageSquareQuote, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@workspace/ui/components/admin/SectionHeader";
import { ImageUploadField } from "@workspace/ui/components/admin/ImageUploadField";
import { ArrayEditor } from "@workspace/ui/components/admin/ArrayEditor";
import { testimonialsFormSchema, type TestimonialsFormValues, type SectionTabProps } from "@workspace/ui/lib/zod/cms";

export function TestimonialsTabContent({ initialData, onSave, isSaving, uploadUrl }: SectionTabProps) {
    const form = useForm<TestimonialsFormValues>({
        resolver: zodResolver(testimonialsFormSchema),
        defaultValues: {
            testimonialHeading: "", testimonialDescription: "", testimonials: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                testimonialHeading: initialData.testimonialSection.heading || "",
                testimonialDescription: initialData.testimonialSection.description || "",
                testimonials: (initialData.testimonialSection.testimonials || []).map((t: any) => ({
                    ...t, category: t.category || "",
                })),
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: TestimonialsFormValues) => {
        const payload = {
            ...values,
            testimonials: values.testimonials?.map(t => ({ ...t, category: t.category || undefined })),
        };
        onSave(payload);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={MessageSquareQuote} title="Testimonials" description="Social proof from your happiest customers." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="testimonialHeading" render={({ field }) => (
                        <FormItem><FormLabel>Section Heading</FormLabel><FormControl><Input placeholder="What people say" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="testimonialDescription" render={({ field }) => (
                        <FormItem><FormLabel>Section Description</FormLabel><FormControl><Textarea rows={2} placeholder="Hear from our users..." {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <ArrayEditor
                    form={form}
                    name="testimonials"
                    title="Testimonial Items"
                    addLabel="Add Testimonial"
                    emptyMessage="No testimonials yet. Add one to get started."
                    defaultItem={{ name: "", position: "", comment: "", category: "", imageUrl: "" }}
                    renderFields={(index) => (
                        <>
                            <FormField control={form.control} name={`testimonials.${index}.name`} render={({ field }) => (
                                <FormItem><FormLabel>Author Name</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`testimonials.${index}.position`} render={({ field }) => (
                                <FormItem><FormLabel>Job Title / Role</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`testimonials.${index}.category`} render={({ field }) => (
                                <FormItem><FormLabel>Category / Filter</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`testimonials.${index}.imageUrl`} render={({ field }) => (
                                <FormItem><FormLabel>Avatar URL</FormLabel><FormControl><ImageUploadField value={field.value ?? ""} onChange={field.onChange} uploadUrl={uploadUrl} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`testimonials.${index}.comment`} render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Quote</FormLabel><FormControl><Textarea rows={2} {...(field as any)} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                />

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Testimonials</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
