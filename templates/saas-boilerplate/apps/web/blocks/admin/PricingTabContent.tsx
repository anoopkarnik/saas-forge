"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { Button } from "@workspace/ui/components/shadcn/button";
import { CreditCard, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { ArrayEditor } from "@/components/admin/ArrayEditor";
import { pricingFormSchema, type PricingFormValues, type SectionTabProps } from "@/lib/zod/cms";

export function PricingTabContent({ initialData, onSave, isSaving }: SectionTabProps) {
    const form = useForm<PricingFormValues>({
        resolver: zodResolver(pricingFormSchema),
        defaultValues: {
            pricingHeading: "", pricingDescription: "", plans: [],
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                pricingHeading: initialData.pricingSection.heading || "",
                pricingDescription: initialData.pricingSection.description || "",
                plans: (initialData.pricingSection.plans || []).map((p: any) => ({
                    ...p, benefitList: p.benefitList ? p.benefitList.join(", ") : ""
                })),
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: PricingFormValues) => {
        const payload = {
            ...values,
            plans: values.plans?.map(p => ({
                ...p,
                benefitList: p.benefitList.split(",").map(b => b.trim()).filter(Boolean),
            })),
        };
        onSave(payload as any);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={CreditCard} title="Pricing Plans" description="Define your pricing tiers and what's included." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="pricingHeading" render={({ field }) => (
                        <FormItem><FormLabel>Section Heading</FormLabel><FormControl><Input placeholder="Simple pricing" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="pricingDescription" render={({ field }) => (
                        <FormItem><FormLabel>Section Description</FormLabel><FormControl><Textarea rows={2} placeholder="Choose the plan that fits..." {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <ArrayEditor
                    form={form}
                    name="plans"
                    title="Pricing Plans"
                    addLabel="Add Plan"
                    emptyMessage="No pricing plans yet. Add one to get started."
                    defaultItem={{ title: "", price: "", popular: false, description: "", priceType: "", benefitList: "" }}
                    renderFields={(index) => (
                        <>
                            <FormField control={form.control} name={`plans.${index}.title`} render={({ field }) => (
                                <FormItem><FormLabel>Plan Title</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`plans.${index}.price`} render={({ field }) => (
                                <FormItem><FormLabel>Price (e.g. $49)</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`plans.${index}.priceType`} render={({ field }) => (
                                <FormItem><FormLabel>Frequency (e.g. /month)</FormLabel><FormControl><Input {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`plans.${index}.popular`} render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm">Popular Plan</FormLabel>
                                        <FormDescription className="text-xs">Highlight this plan with a badge</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name={`plans.${index}.description`} render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Description</FormLabel><FormControl><Textarea rows={2} {...(field as any)} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name={`plans.${index}.benefitList`} render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                    <FormLabel>Benefits</FormLabel>
                                    <FormControl><Textarea rows={2} placeholder="Comma-separated (e.g. Feature A, Feature B)" {...(field as any)} /></FormControl>
                                    <FormDescription>Separate multiple features with commas</FormDescription>
                                </FormItem>
                            )} />
                        </>
                    )}
                />

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Pricing</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
