"use client";

import React from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/shadcn/tabs";
import { Card, CardContent } from "@workspace/ui/components/shadcn/card";
import { Settings2, Loader2, LayoutPanelTop, Home, Sparkles, MessageSquareQuote, CreditCard, HelpCircle, ShieldCheck } from "lucide-react";

import type { CmsFormValues } from "@/lib/zod/cms";
import { useAdminGuard } from "@/hooks/useAdminGuard";
import { NavbarTabContent } from "@/blocks/admin/NavbarTabContent";
import { HeroTabContent } from "@/blocks/admin/HeroTabContent";
import { FeaturesTabContent } from "@/blocks/admin/FeaturesTabContent";
import { TestimonialsTabContent } from "@/blocks/admin/TestimonialsTabContent";
import { PricingTabContent } from "@/blocks/admin/PricingTabContent";
import { FaqTabContent } from "@/blocks/admin/FaqTabContent";
import { LegalTabContent } from "@/blocks/admin/LegalTabContent";

export default function CMSAdminPage() {
    const { isPending, isAdmin } = useAdminGuard();
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const { data: landingInfo, isLoading: isLoadingCMS } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());

    const updateLandingInfoMutation = useMutation(
        trpc.landing.updateLandingInfo.mutationOptions({
            onSuccess: () => {
                toast.success("CMS updated successfully!", {
                    description: "Your landing page Notion database has been updated."
                });
                queryClient.invalidateQueries(trpc.landing.getLandingInfoFromNotion.queryFilter());
            },
            onError: (error) => {
                console.error("Failed to update CMS:", error);
                toast.error("Failed to update CMS", {
                    description: error.message || "Please check server logs for details."
                });
            }
        })
    );

    const handleSave = (values: Partial<CmsFormValues>) => {
        updateLandingInfoMutation.mutate(values as any);
    };

    if (isPending || (!isAdmin && isLoadingCMS)) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    const tabProps = {
        initialData: landingInfo,
        onSave: handleSave,
        isSaving: updateLandingInfoMutation.isPending,
    };

    return (
        <div className="container py-8 px-4 md:px-8 max-w-5xl">
            <div className="mb-8 flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                    <Settings2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Content Management</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Update your landing page content. Changes sync directly to Notion.
                    </p>
                </div>
            </div>

            <Card className="min-h-[500px]">
                {isLoadingCMS ? (
                    <div className="flex flex-col justify-center items-center h-[400px] gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading CMS data...</p>
                    </div>
                ) : (
                    <CardContent>
                        <Tabs defaultValue="navbar" className="w-full">
                            <TabsList className="flex flex-wrap w-full h-auto gap-1 mb-8 justify-start bg-muted/50 p-1.5 rounded-lg">
                                <TabsTrigger value="navbar" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><LayoutPanelTop className="w-3.5 h-3.5" /> Navbar</TabsTrigger>
                                <TabsTrigger value="hero" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><Home className="w-3.5 h-3.5" /> Hero</TabsTrigger>
                                <TabsTrigger value="features" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><Sparkles className="w-3.5 h-3.5" /> Features</TabsTrigger>
                                <TabsTrigger value="testimonials" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><MessageSquareQuote className="w-3.5 h-3.5" /> Testimonials</TabsTrigger>
                                <TabsTrigger value="pricing" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><CreditCard className="w-3.5 h-3.5" /> Pricing</TabsTrigger>
                                <TabsTrigger value="faq" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><HelpCircle className="w-3.5 h-3.5" /> FAQ</TabsTrigger>
                                <TabsTrigger value="legal" className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"><ShieldCheck className="w-3.5 h-3.5" /> Legal & Footer</TabsTrigger>
                            </TabsList>

                            <TabsContent value="navbar"><NavbarTabContent {...tabProps} /></TabsContent>
                            <TabsContent value="hero"><HeroTabContent {...tabProps} /></TabsContent>
                            <TabsContent value="features"><FeaturesTabContent {...tabProps} /></TabsContent>
                            <TabsContent value="testimonials"><TestimonialsTabContent {...tabProps} /></TabsContent>
                            <TabsContent value="pricing"><PricingTabContent {...tabProps} /></TabsContent>
                            <TabsContent value="faq"><FaqTabContent {...tabProps} /></TabsContent>
                            <TabsContent value="legal"><LegalTabContent {...tabProps} /></TabsContent>
                        </Tabs>
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
