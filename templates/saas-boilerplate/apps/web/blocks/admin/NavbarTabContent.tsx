"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Button } from "@workspace/ui/components/shadcn/button";
import { LayoutPanelTop, Github, Save, Loader2 } from "lucide-react";
import { SectionHeader } from "@/components/admin/SectionHeader";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { navbarFormSchema, type NavbarFormValues, type SectionTabProps } from "@/lib/zod/cms";

export function NavbarTabContent({ initialData, onSave, isSaving }: SectionTabProps) {
    const form = useForm<NavbarFormValues>({
        resolver: zodResolver(navbarFormSchema),
        defaultValues: {
            title: "", logo: "", darkLogo: "", githubLink: "",
            githubUsername: "", githubRepositoryName: "", donateNowLink: "",
        },
    });

    useEffect(() => {
        if (initialData) {
            form.reset({
                title: initialData.navbarSection.title || "",
                logo: initialData.navbarSection.logo || "",
                darkLogo: initialData.navbarSection.darkLogo || "",
                githubLink: initialData.navbarSection.githubLink || "",
                githubUsername: initialData.navbarSection.githubUsername || "",
                githubRepositoryName: initialData.navbarSection.githubRepositoryName || "",
                donateNowLink: initialData.navbarSection.donateNowLink || "",
            });
        }
    }, [initialData, form]);

    const onSubmit = (values: NavbarFormValues) => {
        onSave(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <SectionHeader icon={LayoutPanelTop} title="Navbar & Branding" description="Configure your site name, logos, and navigation links." />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>SaaS Name</FormLabel><FormControl><Input placeholder="My SaaS" {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="donateNowLink" render={({ field }) => (
                        <FormItem><FormLabel>Donate / CTA Link</FormLabel><FormControl><Input placeholder="https://..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="logo" render={({ field }) => (
                        <FormItem><FormLabel>Light Logo</FormLabel><FormControl><ImageUploadField value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="darkLogo" render={({ field }) => (
                        <FormItem><FormLabel>Dark Logo</FormLabel><FormControl><ImageUploadField value={field.value ?? ""} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <Separator className="my-2" />

                <div className="flex items-center gap-2 mb-4">
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium text-sm">GitHub Integration</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <FormField control={form.control} name="githubLink" render={({ field }) => (
                        <FormItem><FormLabel>Repository URL</FormLabel><FormControl><Input placeholder="https://github.com/..." {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="githubUsername" render={({ field }) => (
                        <FormItem><FormLabel>Username (for star count)</FormLabel><FormControl><Input placeholder="username" {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="githubRepositoryName" render={({ field }) => (
                        <FormItem><FormLabel>Repo Name (for star count)</FormLabel><FormControl><Input placeholder="my-repo" {...(field as any)} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>

                <div className="flex items-center justify-between pt-4">
                    <p className="text-xs text-muted-foreground">
                        {form.formState.isDirty ? "You have unsaved changes." : "All changes are saved."}
                    </p>
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty} size="sm">
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Navbar</>}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
