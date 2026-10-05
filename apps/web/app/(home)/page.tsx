"use client";

import * as React from "react";
import DashboardPage from "@workspace/ui/blocks/dashboard/DashboardPage";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTRPC } from "@/trpc/client";

export default function Page() {
  const trpc = useTRPC();
  const router = useRouter();
  const saveConfiguration = useMutation(trpc.project.save.mutationOptions());
  const catalogQuery = useQuery(trpc.scaffold.catalog.queryOptions());

  const handleSubmitConfiguration = async (
    safeName: string,
    envVars: Record<string, string>,
    modules: string[],
    expectedTotalCredits: number,
  ) => {
    try {
      const response = await fetch("/api/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: safeName, envVars, modules, expectedTotalCredits }),
      });

      if (response.status === 409) {
        await catalogQuery.refetch();
        toast.error("Prices changed since you opened the wizard. Check the new total and download again.");
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to download");
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safeName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Download failed. Please try again.");
      throw error;
    }
  };

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

  if (!catalogQuery.data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        {catalogQuery.isError ? (
          <p className="text-sm text-muted-foreground">Could not load scaffold prices. Refresh to try again.</p>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        )}
      </div>
    );
  }

  return (
    <DashboardPage
      catalog={catalogQuery.data}
      onSubmitConfiguration={handleSubmitConfiguration}
      onSaveConfiguration={handleSaveConfiguration}
      docsBaseUrl={process.env.NEXT_PUBLIC_URL!}
    />
  );
}
