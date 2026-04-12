"use client";

import React, { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/shadcn/tabs";
import { Card, CardContent } from "@workspace/ui/components/shadcn/card";
import { Search, BarChart3, Loader2 } from "lucide-react";

import { useAdminGuard } from "@/hooks/useAdminGuard";
import { SeoAuditTabContent } from "@/blocks/admin/SeoAuditTabContent";
import { SeoAnalyticsTabContent } from "@/blocks/admin/SeoAnalyticsTabContent";
import type { SeoAuditResponse } from "@/lib/ts-types/seo";

function defaultDateRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
        startDate: start.toISOString().split("T")[0]!,
        endDate: end.toISOString().split("T")[0]!,
    };
}

export default function SeoAdminPage() {
    const { isPending, isAdmin } = useAdminGuard();
    const trpc = useTRPC();

    const [auditData, setAuditData] = useState<SeoAuditResponse | null>(null);
    const [dateRange, setDateRange] = useState(defaultDateRange);

    const runAuditMutation = useMutation(
        trpc.seo.runAudit.mutationOptions({
            onSuccess: (data) => {
                setAuditData(data);
                toast.success("SEO audit complete", {
                    description: `Overall score: ${data.overallScore}%`,
                });
            },
            onError: (error) => {
                toast.error("Audit failed", {
                    description: error.message || "Could not complete the SEO audit.",
                });
            },
        })
    );

    const overviewQuery = useQuery({
        ...trpc.seo.getTrafficOverview.queryOptions(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            { enabled: isAdmin }
        ),
        retry: false,
    });

    const topPagesQuery = useQuery({
        ...trpc.seo.getTopPages.queryOptions(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            { enabled: isAdmin }
        ),
        retry: false,
    });

    const trafficSourcesQuery = useQuery({
        ...trpc.seo.getTrafficSources.queryOptions(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            { enabled: isAdmin }
        ),
        retry: false,
    });

    const deviceQuery = useQuery({
        ...trpc.seo.getDeviceBreakdown.queryOptions(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            { enabled: isAdmin }
        ),
        retry: false,
    });

    const browserQuery = useQuery({
        ...trpc.seo.getBrowserBreakdown.queryOptions(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            { enabled: isAdmin }
        ),
        retry: false,
    });

    const countriesQuery = useQuery({
        ...trpc.seo.getTopCountries.queryOptions(
            { startDate: dateRange.startDate, endDate: dateRange.endDate },
            { enabled: isAdmin }
        ),
        retry: false,
    });

    const realtimeQuery = useQuery({
        ...trpc.seo.getRealtimeUsers.queryOptions(
            void 0,
            { enabled: isAdmin, refetchInterval: 30000 }
        ),
        retry: false,
    });

    const isGa4Configured =
        !overviewQuery.error?.message?.includes("not configured");

    if (isPending) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAdmin) return null;

    return (
        <div className="container py-8 px-4 md:px-8 max-w-5xl">
            <div className="mb-8 flex items-start gap-4">
                <div className="rounded-xl bg-primary/10 p-3">
                    <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        SEO Reports
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Audit your site&apos;s SEO health and view traffic
                        analytics.
                    </p>
                </div>
            </div>

            <Card className="min-h-[500px]">
                <CardContent>
                    <Tabs defaultValue="audit" className="w-full">
                        <TabsList className="flex w-full h-auto gap-1 mb-8 justify-start bg-muted/50 p-1.5 rounded-lg">
                            <TabsTrigger
                                value="audit"
                                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <Search className="w-3.5 h-3.5" /> SEO Audit
                            </TabsTrigger>
                            <TabsTrigger
                                value="analytics"
                                className="flex items-center gap-1.5 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                            >
                                <BarChart3 className="w-3.5 h-3.5" /> Analytics
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="audit">
                            <SeoAuditTabContent
                                onRunAudit={() => runAuditMutation.mutate({})}
                                auditData={auditData}
                                isLoading={runAuditMutation.isPending}
                            />
                        </TabsContent>

                        <TabsContent value="analytics">
                            <SeoAnalyticsTabContent
                                overview={overviewQuery.data ?? null}
                                topPages={topPagesQuery.data ?? null}
                                trafficSources={trafficSourcesQuery.data ?? null}
                                deviceBreakdown={deviceQuery.data ?? null}
                                browserBreakdown={browserQuery.data ?? null}
                                topCountries={countriesQuery.data ?? null}
                                realtimeUsers={realtimeQuery.data ?? null}
                                isLoading={
                                    overviewQuery.isLoading ||
                                    topPagesQuery.isLoading ||
                                    trafficSourcesQuery.isLoading
                                }
                                isConfigured={isGa4Configured}
                                dateRange={dateRange}
                                onDateRangeChange={setDateRange}
                            />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
