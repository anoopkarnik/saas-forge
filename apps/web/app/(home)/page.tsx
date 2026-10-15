"use client";

import * as React from "react";
import DashboardPage from "@workspace/ui/blocks/dashboard/DashboardPage";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { ScaffoldPreview } from "@/components/scaffold-preview/ScaffoldPreview";
import { OnboardingPanel } from "@/components/onboarding/OnboardingPanel";

export default function Page() {
  const trpc = useTRPC();
  const router = useRouter();
  const saveConfiguration = useMutation(trpc.project.save.mutationOptions());
  const catalogQuery = useQuery(trpc.scaffold.catalog.queryOptions());

  const handleSaveConfiguration = async (payload: {
    name: string;
    config: Record<string, unknown>;
    modules: string[];
    platforms: string[];
    productTypeId?: string;
    tierId?: string;
    versionId?: string;
  }) => {
    try {
      const res = await saveConfiguration.mutateAsync({
        name: payload.name,
        productTypeId: payload.productTypeId,
        tierId: payload.tierId,
        versionId: payload.versionId,
        platforms: payload.platforms,
        modules: payload.modules,
        config: payload.config,
      });

      const strippedNote = res.strippedKeys.length
        ? ` ${res.strippedKeys.length} secret value(s) were not stored — fill them via the setup guide.`
        : "";

      toast.success(`Saved "${res.project.name}".${strippedNote}`, {
        action: { label: "View projects", onClick: () => router.push("/projects") },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed. Please try again.");
      throw error;
    }
  };

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-6 pt-6 md:px-8">
        <OnboardingPanel />
      </div>
      {catalogQuery.data ? (
        <DashboardPage
          catalog={catalogQuery.data}
          renderPreview={(selection) => <ScaffoldPreview {...selection} />}
          onSaveConfiguration={handleSaveConfiguration}
          docsBaseUrl={process.env.NEXT_PUBLIC_URL!}
        />
      ) : (
        <div className="flex h-[50vh] items-center justify-center">
          {catalogQuery.isError ? (
            <p className="text-sm text-muted-foreground">Could not load scaffold prices. Refresh to try again.</p>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
        </div>
      )}
    </>
  );
}
