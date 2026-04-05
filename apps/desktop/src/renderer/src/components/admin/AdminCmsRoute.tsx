import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SidebarUser from "../home/SidebarUser";
import { SidebarProvider, SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/shadcn/tabs";
import { Card, CardContent } from "@workspace/ui/components/shadcn/card";
import { Settings2, Loader2, LayoutPanelTop, Home, Sparkles, MessageSquareQuote, CreditCard, HelpCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAdminGuard } from "../../hooks/useAdminGuard";
import { useTRPC } from "../../lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NavbarTabContent } from "@workspace/ui/blocks/admin/NavbarTabContent";
import { HeroTabContent } from "@workspace/ui/blocks/admin/HeroTabContent";
import { FeaturesTabContent } from "@workspace/ui/blocks/admin/FeaturesTabContent";
import { TestimonialsTabContent } from "@workspace/ui/blocks/admin/TestimonialsTabContent";
import { PricingTabContent } from "@workspace/ui/blocks/admin/PricingTabContent";
import { FaqTabContent } from "@workspace/ui/blocks/admin/FaqTabContent";
import { LegalTabContent } from "@workspace/ui/blocks/admin/LegalTabContent";
import type { CmsFormValues } from "@workspace/ui/lib/zod/cms";
import Support from "../support/Support";
import TemplateAppSidebar from "../home/TemplateAppSidebar";

export default function AdminCmsRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const trpc = useTRPC() as any;
    const queryClient = useQueryClient();
    const { data: landingInfo } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());
    const { isPending, isAdmin } = useAdminGuard();

    const { data: cmsData, isLoading: isLoadingCMS } = useQuery(trpc.landing.getLandingInfoFromNotion.queryOptions());

    const updateLandingInfoMutation = useMutation(
        trpc.landing.updateLandingInfo.mutationOptions({
            onSuccess: () => {
                toast.success("CMS updated successfully!", {
                    description: "Your landing page Notion database has been updated."
                });
                queryClient.invalidateQueries(trpc.landing.getLandingInfoFromNotion.queryFilter());
            },
            onError: (error: any) => {
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

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const uploadUrl = `${apiUrl}/api/cms/upload`;

    if (isPending) {
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
    }

    if (!isAdmin) return null;

    const tabProps = {
        initialData: cmsData,
        onSave: handleSave,
        isSaving: updateLandingInfoMutation.isPending,
        uploadUrl,
    };

    return (
        <SidebarProvider>
            <TemplateAppSidebar
                navbarConfig={landingInfo ? { title: (landingInfo as any).navbarSection.title, logo: (landingInfo as any).navbarSection.logo, darkLogo: (landingInfo as any).navbarSection.darkLogo } : null}
                pathname={location.pathname}
                onNavigate={(path) => navigate(path)}
                isAdmin={isAdmin}
                slotUser={<SidebarUser />}
            />
            <div className="flex flex-col flex-1 max-h-screen">
                <div className="flex items-center gap-4 py-2 px-4">
                    <SidebarTrigger />
                    <div className="font-semibold tracking-tight">Content Management</div>
                </div>
                <Separator />
                <div className="flex-1 overflow-auto">
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
                </div>
            </div>
            <Support />
        </SidebarProvider>
    );
}
