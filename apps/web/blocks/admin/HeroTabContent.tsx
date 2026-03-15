"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Home, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ArrayEditor } from "@/components/admin/ArrayEditor";
import { heroFormSchema, type HeroFormValues, type SectionTabProps } from "@/lib/zod/cms";

export function HeroTabContent({ initialData, onSave, isSaving }: SectionTabProps) {
    const form = useForm<HeroFormValues>({
        resolver: zodResolver(heroFormSchema),
        defaultValues: {
            tagline: "", description: "", appointmentLink: "",
            codeSnippet: "", videoLink: "", heroImages: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                tagline: initialData.heroSection.tagline || "",
                description: initialData.heroSection.description || "",
                appointmentLink: initialData.heroSection.appointmentLink || "",
                codeSnippet: initialData.heroSection.codeSnippet || "",
                videoLink: initialData.heroSection.videoLink || "",
                heroImages: initialData.heroSection.heroImages || [],
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: HeroFormValues) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={Home} title="Hero Section" description="The first thing visitors see. Make it count." />
                <FormField control={form.control} name="tagline" render={({ field }) => (
                    <FormItem><FormLabel>Tagline</FormLabel><FormControl><Textarea className="resize-none" rows={2} placeholder="Your bold headline..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea className="resize-none" rows={3} placeholder="A brief description of your product..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="appointmentLink" render={({ field }) => (
                        <FormItem><FormLabel>Appointment / Calendar Link</FormLabel><FormControl><Input placeholder="https://cal.com/..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="videoLink" render={({ field }) => (
                        <FormItem><FormLabel>Video Link (YouTube)</FormLabel><FormControl><Input placeholder="https://youtube.com/..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="codeSnippet" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Hero Code Snippet</FormLabel><FormControl><Input placeholder="npx create-my-app@latest" {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <ArrayEditor
                    form={form}
                    name="heroImages"
                    title="Hero Carousel Images"
                    addLabel="Add Image"
                    emptyMessage="No hero images yet. Add one to get started."
                    defaultItem={{ title: "", imageUrl: "" }}
                    showSeparator={true}
                    renderFields={(index) => (
                        <>
                            <FormField control={form.control} name={`heroImages.${index}.title`} render={({ field }) => (
                                <FormItem><FormLabel>Image Alt/Title</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`heroImages.${index}.imageUrl`} render={({ field }) => (
                                <FormItem><FormLabel>File URL</FormLabel><FormControl><ImageUploadField value={field.value ?? ""} onChange={field.onChange} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                />

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Hero</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
