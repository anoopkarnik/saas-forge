"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Textarea } from "@workspace/ui/components/shadcn/textarea";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Button } from "@workspace/ui/components/shadcn/button";
import { ShieldCheck, Globe, Star, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@workspace/ui/components/admin/SectionHeader";
import { legalFormSchema, type LegalFormValues, type SectionTabProps } from "@workspace/ui/lib/zod/cms";

export function LegalTabContent({ initialData, onSave, isSaving }: SectionTabProps) {
    const form = useForm<LegalFormValues>({
        resolver: zodResolver(legalFormSchema),
        defaultValues: {
            creator: "", creatorLink: "", supportEmailAddress: "", companyLegalName: "",
            websiteUrl: "", country: "", contactNumber: "", address: "", version: "", lastUpdated: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                creator: initialData.footerSection.creator || "",
                creatorLink: initialData.footerSection.creatorLink || "",
                supportEmailAddress: initialData.contactUs.supportEmailAddress || "",
                companyLegalName: initialData.contactUs.companyLegalName || "",
                websiteUrl: initialData.termsOfService.websiteUrl || "",
                country: initialData.termsOfService.country || "",
                contactNumber: initialData.contactUs.contactNumber || "",
                address: initialData.contactUs.address || "",
                version: initialData.termsOfService.version || "",
                lastUpdated: initialData.termsOfService.lastUpdated || "",
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: LegalFormValues) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={ShieldCheck} title="Legal & Footer" description="Company info, contact details, and legal compliance." />

                <div className="flex items-center gap-2 mb-4">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Company Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="creator" render={({ field }) => (
                        <FormItem><FormLabel>Creator Name</FormLabel><FormControl><Input placeholder="John Doe" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="creatorLink" render={({ field }) => (
                        <FormItem><FormLabel>Creator Link</FormLabel><FormControl><Input placeholder="https://..." {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="companyLegalName" render={({ field }) => (
                        <FormItem><FormLabel>Company Legal Name</FormLabel><FormControl><Input placeholder="Acme Inc." {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="websiteUrl" render={({ field }) => (
                        <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input placeholder="https://example.com" {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <Separator className="my-2" />

                <div className="flex items-center gap-2 mb-4">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Contact Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="supportEmailAddress" render={({ field }) => (
                        <FormItem><FormLabel>Support Email</FormLabel><FormControl><Input placeholder="support@example.com" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="contactNumber" render={({ field }) => (
                        <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="+1 (555) 000-0000" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                        <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Textarea rows={2} placeholder="123 Main St, City, State" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="country" render={({ field }) => (
                        <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="United States" {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <Separator className="my-2" />

                <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">Terms of Service</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="version" render={({ field }) => (
                        <FormItem><FormLabel>Terms Version</FormLabel><FormControl><Input placeholder="1.0.0" {...(field as any)} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="lastUpdated" render={({ field }) => (
                        <FormItem><FormLabel>Last Updated Date</FormLabel><FormControl><Input placeholder="YYYY-MM-DD" {...(field as any)} /></FormControl></FormItem>
                    )} />
                </div>

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Legal</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
