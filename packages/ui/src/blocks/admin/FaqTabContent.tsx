"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Button } from "@workspace/ui/components/shadcn/button";
import { HelpCircle, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@workspace/ui/components/admin/SectionHeader";
import { ArrayEditor } from "@workspace/ui/components/admin/ArrayEditor";
import { faqFormSchema, type FaqFormValues, type SectionTabProps } from "@workspace/ui/lib/zod/cms";

export function FaqTabContent({ initialData, onSave, isSaving }: SectionTabProps) {
    const form = useForm<FaqFormValues>({
        resolver: zodResolver(faqFormSchema),
        defaultValues: {
            faqHeading: "", faqDescription: "", faqs: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                faqHeading: initialData.faqSection.heading || "",
                faqDescription: initialData.faqSection.description || "",
                faqs: initialData.faqSection.faqs || [],
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: FaqFormValues) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={HelpCircle} title="FAQ Section" description="Answer common questions to reduce support load." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="faqHeading" render={({ field }) => (
                        <FormItem><FormLabel>Section Heading</FormLabel><FormControl><Input placeholder="Frequently asked questions" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="faqDescription" render={({ field }) => (
                        <FormItem><FormLabel>Section Description</FormLabel><FormControl><Textarea rows={2} placeholder="Got questions? We have answers." {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <ArrayEditor
                    form={form}
                    name="faqs"
                    title="FAQ Items"
                    addLabel="Add FAQ"
                    emptyMessage="No FAQs yet. Add one to get started."
                    defaultItem={{ question: "", answer: "" }}
                    renderFields={(index) => (
                        <>
                            <FormField control={form.control} name={`faqs.${index}.question`} render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Question</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`faqs.${index}.answer`} render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Answer</FormLabel><FormControl><Textarea rows={3} {...(field as any)} /></FormControl></FormItem>
                            )} />
                        </>
                    )}
                />

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save FAQ</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
