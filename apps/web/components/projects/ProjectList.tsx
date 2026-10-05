"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { buildEnvVarsFromForm } from "@workspace/ui/lib/utils/scaffold";
import type { FormValues } from "@workspace/ui/lib/zod/download";
import { useTRPC } from "@/trpc/client";
import { useScaffoldTRPC } from "@/trpc/scaffold-client";
import { splitSecretEnv } from "@workspace/ui/lib/scaffold-secrets";
import {
  ReleaseEmailSettings,
  ReleaseNotesPanel,
  SecurityBanner,
  UpgradePreview,
} from "@/components/projects/UpgradeCenter";

type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  productTypeId: string | null;
  tierId: string;
  versionId: string;
  platforms: string[];
  modules: string[];
  templateVersion: string;
  releasesBehind: number;
  securityAdvisories: number;
  lastBuiltAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const PRICE_CHANGED = "Prices changed. Check the new total and try again.";

async function downloadFromConfig(
  slug: string,
  config: Record<string, unknown>,
  modules: string[],
  expectedTotalCredits: number | undefined,
) {
  // Saved configs hold no secrets; splitting keeps any stray one off the wire.
  const { publicEnv: envVars } = splitSecretEnv(buildEnvVarsFromForm(config as FormValues));
  const response = await fetch("/api/scaffold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: slug, envVars, modules, expectedTotalCredits }),
  });
  if (response.status === 409) throw new Error(PRICE_CHANGED);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Download failed");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

const TIERS = ["tier-1", "tier-2", "tier-3", "tier-4", "tier-5", "tier-6"];

async function upgradeProject(
  slug: string,
  modules: string[],
  tierId: string,
  expectedTotalCredits: number | undefined,
) {
  const response = await fetch("/api/scaffold/upgrade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, modules, tierId, expectedTotalCredits }),
  });
  if (response.status === 409) throw new Error(PRICE_CHANGED);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error ?? "Upgrade failed");
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-upgrade.zip`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

function ProjectRow({ project }: { project: ProjectListItem }) {
  const trpc = useTRPC();
  const scaffoldTrpc = useScaffoldTRPC();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [targetTier, setTargetTier] = useState(project.tierId);
  const [extraModules, setExtraModules] = useState<string[]>([]);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const targetModules = Array.from(new Set([...project.modules, ...extraModules]));
  const catalog = useQuery({ ...trpc.scaffold.catalog.queryOptions(), enabled: upgradeOpen });

  const detail = useQuery({
    ...trpc.project.get.queryOptions({ slug: project.slug }),
    enabled: open,
  });
  const guide = useQuery({
    ...trpc.project.setupGuide.queryOptions({ slug: project.slug }),
    enabled: open,
  });
  const estimate = useQuery({
    ...scaffoldTrpc.project.estimateDownload.queryOptions({ slug: project.slug }),
    enabled: open,
  });
  const upgradeEstimate = useQuery({
    ...trpc.project.estimateUpgrade.queryOptions({
      slug: project.slug,
      targetModules,
      targetTierId: targetTier,
    }),
    enabled: upgradeOpen,
  });

  const duplicate = useMutation(
    trpc.project.duplicate.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success("Project duplicated");
      },
    }),
  );
  const remove = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: async () => {
        await qc.invalidateQueries({ queryKey: trpc.project.list.queryKey() });
        toast.success("Project deleted");
      },
    }),
  );

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const data =
        detail.data ??
        (await qc.fetchQuery(
          trpc.project.get.queryOptions({ slug: project.slug }),
        ));
      const record = data as unknown as
        | { config?: Record<string, unknown> }
        | undefined;
      const config = record?.config ?? {};
      // The server compares against the catalog price and charges nothing when
      // this exact build is already owned.
      await downloadFromConfig(project.slug, config, project.modules, estimate.data?.fullCredits);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{project.name}</span>
            <Badge variant="secondary">{project.tierId}</Badge>
            <Badge variant="outline">{project.versionId}</Badge>
            {project.modules.map((m) => (
              <Badge key={m}>{m}</Badge>
            ))}
            {project.releasesBehind > 0 ? (
              <Badge variant="outline">
                {project.releasesBehind} release{project.releasesBehind === 1 ? "" : "s"} behind
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            {project.platforms.join(", ")} · boilerplate v{project.templateVersion} · updated{" "}
            {new Date(project.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? "Downloading…" : "Download"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide setup" : "Setup guide"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setNotesOpen((v) => !v)}>
            {notesOpen ? "Hide what's new" : "What's new"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUpgradeOpen((v) => !v)}
          >
            {upgradeOpen ? "Cancel upgrade" : "Upgrade"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={duplicate.isPending}
            onClick={() => duplicate.mutate({ slug: project.slug })}
          >
            Duplicate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ slug: project.slug })}
          >
            Delete
          </Button>
        </div>
      </div>

      <SecurityBanner slug={project.slug} count={project.securityAdvisories} />

      {notesOpen ? (
        <div className="rounded-md bg-muted/40 p-4 text-sm">
          <ReleaseNotesPanel slug={project.slug} />
        </div>
      ) : null}

      {open ? (
        <div className="flex flex-col gap-4 rounded-md bg-muted/40 p-4 text-sm">
          {estimate.data ? (
            <p className="text-muted-foreground">
              Download cost:{" "}
              <span className="font-medium text-foreground">
                {estimate.data.credits} credits
              </span>
              {estimate.data.alreadyBuilt ? " (you already own this build, so it is free)" : null}
            </p>
          ) : null}

          {guide.isLoading ? (
            <p className="text-muted-foreground">Loading setup guide…</p>
          ) : guide.data ? (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="mb-1 font-medium">Accounts to create</h3>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {guide.data.accounts.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 font-medium">Environment variables to fill</h3>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {guide.data.secrets.map((s) => (
                    <li key={s}>
                      <code className="text-xs">{s}</code>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-1 font-medium">Steps</h3>
                <ol className="list-decimal pl-5 text-muted-foreground">
                  {guide.data.steps.map((step) => (
                    <li key={step.title}>
                      <span className="text-foreground">{step.title}</span>
                      <ul className="list-disc pl-5">
                        {step.details.map((d) => (
                          <li key={d}>{d}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {upgradeOpen ? (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="font-medium">Target tier</span>
            <select
              value={targetTier}
              onChange={(e) => setTargetTier(e.target.value)}
              className="w-44 rounded border bg-background p-1 text-sm"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                  {t === project.tierId ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-medium">Add modules</span>
            {(catalog.data?.modules ?? []).filter(
              (m) => m.available && !project.modules.includes(m.id),
            ).map((m) => (
              <label key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={extraModules.includes(m.id)}
                  onChange={(e) =>
                    setExtraModules((prev) =>
                      e.target.checked
                        ? [...prev, m.id]
                        : prev.filter((x) => x !== m.id),
                    )
                  }
                />
                <span>
                  {m.label}{" "}
                  <span className="text-muted-foreground">
                    (+{m.creditsCost} credits)
                  </span>
                </span>
              </label>
            ))}
            {project.modules.length ? (
              <p className="text-xs text-muted-foreground">
                Already included: {project.modules.join(", ")}
              </p>
            ) : null}
          </div>
          <UpgradePreview slug={project.slug} targetModules={targetModules} targetTierId={targetTier} />
          {upgradeEstimate.data ? (
            <p className="text-muted-foreground">
              Upgrade cost:{" "}
              <span className="font-medium text-foreground">
                {upgradeEstimate.data.deltaCredits} credits
              </span>
            </p>
          ) : null}
          <div>
            <Button
              size="sm"
              disabled={
                isUpgrading ||
                (!!upgradeEstimate.data &&
                  upgradeEstimate.data.addedModules.length === 0 &&
                  upgradeEstimate.data.tierSteps === 0)
              }
              onClick={async () => {
                setIsUpgrading(true);
                try {
                  await upgradeProject(
                    project.slug,
                    targetModules,
                    targetTier,
                    upgradeEstimate.data?.deltaCredits,
                  );
                  toast.success(
                    "Upgrade kit downloaded — run /upgrade-boilerplate in your project",
                  );
                  await qc.invalidateQueries({
                    queryKey: trpc.project.list.queryKey(),
                  });
                  setUpgradeOpen(false);
                  setExtraModules([]);
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Upgrade failed",
                  );
                } finally {
                  setIsUpgrading(false);
                }
              }}
            >
              {isUpgrading ? "Generating…" : "Generate upgrade kit"}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function ProjectList() {
  const trpc = useTRPC();
  const list = useQuery(trpc.project.list.queryOptions());

  if (list.isLoading)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (list.error)
    return <p className="text-sm text-destructive">{list.error.message}</p>;

  const rows = (list.data ?? []) as ProjectListItem[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">My Projects</h1>
        <p className="text-sm text-muted-foreground">
          Saved configurations you can download or upgrade. Secrets are never stored — each
          project ships with a setup guide for the env vars it needs.
        </p>
      </div>

      <ReleaseEmailSettings />

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          You haven&apos;t saved any project configurations yet. Build one on the dashboard and click
          &ldquo;Save configuration&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((project) => (
            <ProjectRow key={project.id} project={project} />
          ))}
        </ul>
      )}
    </div>
  );
}
