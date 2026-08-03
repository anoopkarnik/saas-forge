"use client";

import * as React from "react";
import {
  ArrowRight,
  Box,
  Check,
  ChevronDown,
  Circle,
  Clock3,
  Coins,
  Database,
  Gauge,
  Info,
  PackageCheck,
  PlusCircle,
  Search,
  Server,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { cn } from "@workspace/ui/lib/utils";
import {
  PRODUCT_TYPE_BLUEPRINTS,
  TIER_BLUEPRINTS,
  VERSION_PROFILES,
  recommendTier,
  resolvePreset,
  type ProductTypeId,
  type ResolvedPreset,
  type StageEstimate,
  type TierId,
  type VersionId,
} from "@workspace/ui/lib/constants/presets";

type StageKind = StageEstimate["kind"];

interface PresetJourneyProps {
  productTypeId: ProductTypeId | null;
  tierId: TierId;
  versionId: VersionId;
  stage: StageEstimate;
  appliedPresetId?: string;
  onProductTypeChange: (productTypeId: ProductTypeId) => void;
  onTierChange: (tierId: TierId) => void;
  onVersionChange: (versionId: VersionId) => void;
  onStageChange: (stage: StageEstimate) => void;
  onApply: (preset: ResolvedPreset) => void;
  onBack: () => void;
}

const SUBSTEPS = ["Product Type", "Tier", "Version"] as const;

const NODE_ICONS = {
  client: Box,
  application: Server,
  data: Database,
  service: Sparkles,
} as const;

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function BlueprintDetail({
  icon: Icon,
  title,
  summary,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group border-b border-border/60 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm marker:hidden hover:bg-muted/30">
        <Icon className="h-4 w-4 shrink-0 text-foreground" />
        <span className="w-36 shrink-0 font-medium">{title}</span>
        <span className="line-clamp-1 flex-1 text-muted-foreground">
          {summary}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 pl-11 text-sm text-muted-foreground">
        {children}
      </div>
    </details>
  );
}

function VersionCard({
  preset,
  selected,
  onSelect,
}: {
  preset: ResolvedPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "min-w-0 rounded-xl border bg-background p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        selected
          ? "border-blue-600 ring-1 ring-blue-500/20"
          : "border-border/70 hover:border-blue-500/50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-blue-600" : "border-muted-foreground/50",
          )}
        >
          {selected ? (
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">{preset.name}</span>
            {preset.version.id === "balanced" ? (
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                Recommended
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {preset.version.description}
          </p>
        </div>
      </div>
      <dl className="mt-4 space-y-2 border-t border-border/60 pt-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" /> Starter setup
          </dt>
          <dd className="font-medium text-foreground">
            {preset.delivery.starterSetup}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Working launch
          </dt>
          <dd className="font-medium text-foreground">
            {preset.delivery.workingLaunch}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-3.5 w-3.5" /> Infra / month
          </dt>
          <dd className="font-medium text-foreground">
            {formatMoney(preset.cost.low)}–{formatMoney(preset.cost.high)}
          </dd>
        </div>
      </dl>
    </button>
  );
}

function ArchitectureBlueprint({ preset }: { preset: ResolvedPreset }) {
  const primaryNodes = preset.architecture.slice(0, 3);
  const supportingNodes = preset.architecture.slice(3);

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
      <div className="flex flex-col gap-2 border-b border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold">
            {preset.name} architecture blueprint
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {preset.productType.summary}
          </p>
        </div>
        <Badge variant="outline">{preset.capacityLabel}</Badge>
      </div>

      <div className="grid gap-4 border-b border-border/60 p-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <div>
          <p className="text-sm font-medium">How it works</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Start with a managed core, then add only the domain systems this
            product needs.
          </p>
        </div>
        <div className="min-w-0">
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            {primaryNodes.map((node, index) => {
              const Icon = NODE_ICONS[node.kind];
              return (
                <React.Fragment key={node.id}>
                  {index > 0 ? (
                    <ArrowRight className="mx-auto h-4 w-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
                  ) : null}
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 px-3 py-2">
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {node.label}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {node.detail}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          {supportingNodes.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {supportingNodes.map((node) => {
                const Icon = NODE_ICONS[node.kind];
                return (
                  <div
                    key={node.id}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {node.label}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {node.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div>
        <BlueprintDetail
          icon={PackageCheck}
          title="Included in your scaffold"
          summary={preset.includedInScaffold.slice(0, 2).join(", ")}
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {preset.includedInScaffold.map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </BlueprintDetail>
        <BlueprintDetail
          icon={PlusCircle}
          title="You add next"
          summary={preset.addNext[0] ?? "Product-specific capabilities"}
        >
          <ul className="space-y-2">
            {preset.addNext.map((item) => (
              <li key={item} className="flex gap-2">
                <Circle className="mt-1 h-2.5 w-2.5 shrink-0 fill-muted-foreground/30 text-muted-foreground/30" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </BlueprintDetail>
        <BlueprintDetail
          icon={Gauge}
          title="First bottleneck"
          summary={preset.firstBottleneck}
        >
          <p>{preset.firstBottleneck}</p>
          <p className="mt-3 font-medium text-foreground">Service limits</p>
          <ul className="mt-3 space-y-2">
            {preset.serviceLimits.map((limit) => (
              <li key={limit.service}>
                <span className="font-medium text-foreground">
                  {limit.service}:
                </span>{" "}
                {limit.limit}
              </li>
            ))}
          </ul>
        </BlueprintDetail>
        <BlueprintDetail
          icon={TrendingUp}
          title="Upgrade trigger"
          summary={preset.upgradeTrigger}
        >
          <p>{preset.upgradeTrigger}</p>
        </BlueprintDetail>
        <BlueprintDetail
          icon={Info}
          title="Accounts & setup"
          summary={`${preset.accountsNeeded.length} accounts; ${preset.secretsToFill.length} keys or values`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-medium text-foreground">Accounts required</p>
              <ul className="mt-2 space-y-1">
                {preset.accountsNeeded.map((account) => (
                  <li key={account}>{account}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Setup guidance</p>
              <ol className="mt-2 space-y-2">
                {preset.steps.map((step, index) => (
                  <li key={step.title}>
                    {index + 1}. {step.title}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </BlueprintDetail>
      </div>

      <div className="border-t border-border/60 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium">
              Estimated infrastructure cost (USD / month)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Baseline managed infrastructure · reviewed{" "}
              {preset.cost.lastReviewed}
            </p>
          </div>
          <p className="text-sm font-semibold">
            {formatMoney(preset.cost.low)}–{formatMoney(preset.cost.high)} /
            month
          </p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-border/60 bg-muted/30 text-muted-foreground">
                <th className="px-3 py-2 font-medium">Component</th>
                <th className="px-3 py-2 font-medium">Low</th>
                <th className="px-3 py-2 font-medium">High</th>
                <th className="px-3 py-2 font-medium">What it covers</th>
              </tr>
            </thead>
            <tbody>
              {preset.cost.components.map((component) => (
                <tr key={component.name} className="border-b border-border/50">
                  <td className="px-3 py-2 font-medium">{component.name}</td>
                  <td className="px-3 py-2">{formatMoney(component.low)}</td>
                  <td className="px-3 py-2">{formatMoney(component.high)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {component.covers}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <p>
            <span className="font-medium text-foreground">
              Variable drivers:
            </span>{" "}
            {preset.cost.variableDrivers.join(", ")}.
          </p>
          <p>
            <span className="font-medium text-foreground">Excluded:</span>{" "}
            {preset.cost.exclusions.join(", ")}.
          </p>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {preset.delivery.assumption}
        </p>
      </div>
    </div>
  );
}

export function PresetJourney({
  productTypeId,
  tierId,
  versionId,
  stage,
  appliedPresetId,
  onProductTypeChange,
  onTierChange,
  onVersionChange,
  onStageChange,
  onApply,
  onBack,
}: PresetJourneyProps) {
  const [search, setSearch] = React.useState("");
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const deferredSearch = React.useDeferredValue(search.trim().toLowerCase());
  const recommendedTierId = recommendTier(stage);
  const selectedTierOrder =
    TIER_BLUEPRINTS.find((entry) => entry.id === tierId)?.order ?? 1;

  const filteredProducts = React.useMemo(() => {
    if (!deferredSearch) return PRODUCT_TYPE_BLUEPRINTS;
    return PRODUCT_TYPE_BLUEPRINTS.filter((entry) =>
      [entry.name, entry.summary, ...entry.examples].some((value) =>
        value.toLowerCase().includes(deferredSearch),
      ),
    );
  }, [deferredSearch]);

  const resolvedVersions = React.useMemo(() => {
    if (!productTypeId) return [];
    return VERSION_PROFILES.map((version) =>
      resolvePreset(productTypeId, tierId, version.id),
    );
  }, [productTypeId, tierId]);

  const selectedPreset =
    resolvedVersions.find((preset) => preset.version.id === versionId) ?? null;
  const selectedProduct =
    PRODUCT_TYPE_BLUEPRINTS.find((entry) => entry.id === productTypeId) ?? null;
  const replacingPreset = Boolean(
    selectedPreset && appliedPresetId && selectedPreset.id !== appliedPresetId,
  );

  const applySelected = React.useCallback(() => {
    if (selectedPreset) onApply(selectedPreset);
  }, [onApply, selectedPreset]);

  const handleUsePreset = React.useCallback(() => {
    if (!selectedPreset) return;
    if (replacingPreset) {
      setConfirmOpen(true);
      return;
    }
    applySelected();
  }, [applySelected, replacingPreset, selectedPreset]);

  const handleStageKindChange = React.useCallback(
    (kind: StageKind) => {
      const nextStage: StageEstimate =
        kind === "mau"
          ? { kind, value: stage.kind === "mau" ? stage.value : 0 }
          : { kind };
      onStageChange(nextStage);
      onTierChange(recommendTier(nextStage));
    },
    [onStageChange, onTierChange, stage],
  );

  const handleMauChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Math.max(0, Number(event.target.value) || 0);
      const nextStage: StageEstimate = { kind: "mau", value };
      onStageChange(nextStage);
      onTierChange(recommendTier(nextStage));
    },
    [onStageChange, onTierChange],
  );

  return (
    <section
      aria-labelledby="preset-journey-title"
      className="overflow-hidden rounded-2xl border border-border/70 bg-background"
    >
      <div className="border-b border-border/60 px-5 py-5 sm:px-6">
        <h3 id="preset-journey-title" className="text-xl font-semibold">
          Choose how you want to ship
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick your product, stage, and build depth. We&apos;ll map the
          architecture for you.
        </p>
        <ol
          className="mt-5 grid grid-cols-3 gap-3"
          aria-label="Preset selection progress"
        >
          {SUBSTEPS.map((step, index) => {
            const complete = index < 2 && Boolean(productTypeId);
            const active =
              index === 0
                ? !productTypeId
                : index === 2 && Boolean(productTypeId);
            return (
              <li key={step} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    complete && "border-emerald-600 bg-emerald-600 text-white",
                    active &&
                      !complete &&
                      "border-blue-600 text-blue-600 dark:text-blue-400",
                  )}
                >
                  {complete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "hidden font-medium sm:inline",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step}
                </span>
                {index < SUBSTEPS.length - 1 ? (
                  <span className="h-px flex-1 bg-border" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid 2xl:grid-cols-[minmax(230px,0.75fr)_minmax(280px,0.9fr)_minmax(0,2.35fr)]">
        <div className="border-b border-border/60 p-4 2xl:border-r 2xl:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Product Type</h4>
            <span className="text-xs text-muted-foreground">
              22 product types
            </span>
          </div>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product types..."
              aria-label="Search product types"
              className="pl-9"
            />
          </div>
          <div className="mt-3 max-h-[430px] overflow-y-auto pr-3 2xl:h-[430px]">
            <div className="space-y-1">
              {filteredProducts.map((entry) => {
                const active = entry.id === productTypeId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onProductTypeChange(entry.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                      active
                        ? "border-blue-600 bg-blue-50 dark:bg-blue-950/30"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <entry.icon
                      className={cn(
                        "h-5 w-5 shrink-0",
                        active
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {entry.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {entry.examples.slice(0, 3).join(", ")}
                      </span>
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    ) : null}
                  </button>
                );
              })}
              {filteredProducts.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No product types match your search.
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Examples describe familiar product patterns only; they do not imply
            affiliation.
          </p>
        </div>

        <div className="border-b border-border/60 p-4 2xl:border-r 2xl:border-b-0">
          <h4 className="text-sm font-semibold">Tier</h4>
          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px] 2xl:grid-cols-1">
            <div className="relative">
              <select
                value={stage.kind}
                onChange={(event) =>
                  handleStageKindChange(event.target.value as StageKind)
                }
                aria-label="Current product stage"
                className="h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="mvp">Building an MVP</option>
                <option value="beta">Beta / invite-only</option>
                <option value="mau">Use expected MAU</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            {stage.kind === "mau" ? (
              <Input
                type="number"
                min={0}
                value={stage.value}
                onChange={handleMauChange}
                aria-label="Expected monthly active users"
                placeholder="Expected MAU"
              />
            ) : null}
          </div>

          <div className="relative mt-5 space-y-2 before:absolute before:bottom-7 before:left-[13px] before:top-7 before:w-px before:bg-border">
            {TIER_BLUEPRINTS.map((tier) => {
              const active = tier.id === tierId;
              const recommended = tier.id === recommendedTierId;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => onTierChange(tier.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex w-full items-start gap-3 rounded-lg border border-transparent px-1 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                    active &&
                      "border-blue-500/40 bg-blue-50 px-3 dark:bg-blue-950/30",
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-background",
                      active && "border-blue-600 ring-4 ring-blue-500/10",
                      tier.order < selectedTierOrder &&
                        "border-emerald-600 bg-emerald-600 text-white",
                    )}
                  >
                    {tier.order < selectedTierOrder ? (
                      <Check className="h-4 w-4" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      Tier {tier.order} · {tier.name}
                      {recommended ? (
                        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300">
                          Recommended
                        </Badge>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {tier.mauLabel}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      {tier.goal}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Version</h4>
            {selectedProduct ? (
              <span className="text-xs text-muted-foreground">
                {selectedProduct.name}
              </span>
            ) : null}
          </div>
          {selectedProduct ? (
            <>
              <div className="mt-3 grid gap-3 2xl:grid-cols-3">
                {resolvedVersions.map((preset) => (
                  <VersionCard
                    key={preset.id}
                    preset={preset}
                    selected={preset.version.id === versionId}
                    onSelect={() => onVersionChange(preset.version.id)}
                  />
                ))}
              </div>
              {selectedPreset ? (
                <div className="mt-4">
                  <ArchitectureBlueprint preset={selectedPreset} />
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-3 flex min-h-[430px] items-center justify-center rounded-xl border border-dashed border-border p-8 text-center">
              <div className="max-w-sm">
                <Sparkles className="mx-auto h-7 w-7 text-blue-600 dark:text-blue-400" />
                <p className="mt-3 text-sm font-medium">
                  Choose a product type first
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;ll combine its architecture with your recommended tier
                  and three build-depth options.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-border/70 bg-background/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <p className="order-last text-center text-xs text-muted-foreground sm:order-none">
          You can change every choice later.
        </p>
        <Button
          type="button"
          onClick={handleUsePreset}
          disabled={!selectedPreset}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {selectedPreset
            ? `Use ${selectedPreset.name}`
            : "Choose a product type"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="replace-preset-title"
            aria-describedby="replace-preset-description"
            className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg"
          >
            <h4 id="replace-preset-title" className="text-lg font-semibold">
              Replace the applied preset?
            </h4>
            <p
              id="replace-preset-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              This replaces preset-managed feature and provider choices with{" "}
              {selectedPreset?.name}. Product identity fields and every secret
              or API key you already entered are preserved.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmOpen(false)}
              >
                Keep current preset
              </Button>
              <Button
                type="button"
                onClick={() => {
                  applySelected();
                  setConfirmOpen(false);
                }}
              >
                Replace preset
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
