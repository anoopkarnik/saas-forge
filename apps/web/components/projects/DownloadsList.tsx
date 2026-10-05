"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useTRPC } from "@/trpc/client";

const STATUS_LABEL: Record<string, string> = {
  building: "Building",
  ready: "Ready",
  failed: "Failed",
};

async function redownload(jobId: string, name: string) {
  const response = await fetch(`/api/scaffold/builds/${jobId}`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Download failed");
  }
  const url = window.URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/** Every download the user received; delivered builds re-download for free. */
export function DownloadsList() {
  const trpc = useTRPC();
  const downloads = useQuery(trpc.scaffold.downloads.queryOptions());
  const [busy, setBusy] = useState<string | null>(null);

  if (downloads.isLoading || !downloads.data?.length) return null;

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">My downloads</h2>
        <p className="text-sm text-muted-foreground">
          Download any build you received again at no cost. Secrets you added in your browser are not
          stored, so add them again from SETUP.md.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {downloads.data.map((job) => {
          const name = job.projectName ?? "saas-forge-app";
          return (
            <li key={job.id} className="flex flex-col gap-2 rounded-md border p-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{name}</span>
                  <Badge variant={job.status === "failed" ? "destructive" : "secondary"}>
                    {STATUS_LABEL[job.status] ?? job.status}
                  </Badge>
                  {job.toModules.map((module) => (
                    <Badge key={module} variant="outline">
                      {module}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {job.platforms.join(", ") || "web"} · boilerplate v{job.templateVersion} ·{" "}
                  {new Date(job.createdAt).toLocaleDateString()} ·{" "}
                  {job.refundedAt ? "refunded" : `${job.creditsSpent} credits`}
                </p>
              </div>
              {job.status === "ready" ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === job.id}
                  onClick={async () => {
                    setBusy(job.id);
                    try {
                      await redownload(job.id, name);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Download failed");
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  {busy === job.id ? "Downloading…" : "Download again (free)"}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
