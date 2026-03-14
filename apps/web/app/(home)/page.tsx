"use client";

import * as React from "react";
import DashboardPage from "@workspace/ui/blocks/dashboard/DashboardPage";
import { toast } from "sonner";

export default function Page() {
  const handleSubmitConfiguration = async (safeName: string, envVars: Record<string, string>) => {
    try {
      const response = await fetch("/api/scaffold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: safeName, envVars }),
      });

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

  return (
    <DashboardPage
      onSubmitConfiguration={handleSubmitConfiguration}
      docsBaseUrl={process.env.NEXT_PUBLIC_URL!}
    />
  );
}
