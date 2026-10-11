"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  FileUp,
  Layers3,
  Lock,
  Rocket,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@workspace/ui/components/shadcn/form";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Progress } from "@workspace/ui/components/shadcn/progress";
import { Switch } from "@workspace/ui/components/shadcn/switch";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";

import { cn } from "../../lib/utils";
import { useIsGuest } from "../../hooks/useIsGuest";
import { formSchema, FormValues } from "../../lib/zod/download";
import { MODULE_CONFIG } from "../../lib/constants/module";
import {
  quoteFromCatalog,
  toggleModule,
  type ScaffoldCatalog,
  type ScaffoldModuleId,
} from "../../lib/constants/scaffold-modules";
import { isSecretEnvKey } from "../../lib/scaffold-secrets";
import {
  type ProductTypeId,
  type ResolvedPreset,
  type StageEstimate,
  type TierId,
  type VersionId,
} from "../../lib/constants/presets";
import EnvField from "../../components/home/EnvField";
import {
  buildEnvVarsFromForm,
  buildVercelDeployUrl,
  parseEnvFile,
} from "../../lib/utils/scaffold";
import { formatList } from "../../lib/utils/formatList";
import {
  getAccountsProviderGroups,
  getReviewSummaryItems,
  getWizardFieldMeta,
  getWizardStepFields,
  isWizardFieldComplete,
  isWizardFieldRequired,
  SECRET_WIZARD_FIELDS,
  WIZARD_STEPS,
  type EntryChoice,
  type ProviderGroup,
  type WizardFieldName,
  type WizardStepId,
} from "../../lib/scaffold-wizard";

interface DashboardPageProps {
  /** Prices and modules from the server's `scaffold.catalog`. */
  catalog: ScaffoldCatalog;
  onSubmitConfiguration: (
    safeName: string,
    envVars: Record<string, string>,
    modules: ScaffoldModuleId[],
    /** The total the buyer saw; the server answers 409 if the price changed. */
    expectedTotalCredits: number,
  ) => Promise<void>;
  onSaveConfiguration?: (payload: {
    name: string;
    config: Record<string, unknown>;
    modules: ScaffoldModuleId[];
    platforms: string[];
    productTypeId?: string;
    tierId?: string;
    versionId?: string;
  }) => Promise<void> | void;
  docsBaseUrl?: string;
  onNavigateDoc?: (slug: string) => void;
  /** Host-provided preview of the current selection, shown under the summary. */
  renderPreview?: (selection: {
    modules: ScaffoldModuleId[];
    platforms: Array<"web" | "desktop" | "mobile">;
  }) => React.ReactNode;
}


const DEFAULT_FORM_VALUES: FormValues = {
  name: "",
  NEXT_PUBLIC_THEME: "neutral",
  NEXT_PUBLIC_THEME_TYPE: "system",
  SELECTED_MODULES: [],
  NEXT_PUBLIC_SAAS_NAME: "",
  NEXT_PUBLIC_COMPANY_NAME: "",
  NEXT_PUBLIC_URL: "",
  NEXT_PUBLIC_PLATFORM: ["web"],
  NEXT_PUBLIC_CMS: "postgres",
  UPSTASH_REDIS_REST_URL: "",
  UPSTASH_REDIS_REST_TOKEN: "",
  NEXT_PUBLIC_AUTH_FRAMEWORK: "better-auth",
  BETTER_AUTH_SECRET: "",
  NEXT_PUBLIC_AUTH_PROVIDERS: [],
  AUTH_LINKEDIN_CLIENT_ID: "",
  AUTH_LINKEDIN_CLIENT_SECRET: "",
  AUTH_GITHUB_CLIENT_ID: "",
  AUTH_GITHUB_CLIENT_SECRET: "",
  AUTH_GOOGLE_CLIENT_ID: "",
  AUTH_GOOGLE_CLIENT_SECRET: "",
  NEXT_PUBLIC_EMAIL_CLIENT: "none",
  RESEND_API_KEY: "",
  NEXT_PUBLIC_SUPPORT_FEATURES: [],
  NEXT_PUBLIC_SUPPORT_MAIL: "",
  NEXT_PUBLIC_CALENDLY_BOOKING_URL: "",
  NEXT_PUBLIC_IMAGE_STORAGE: "vercel_blob",
  BLOB_READ_WRITE_TOKEN: "",
  R2_ACCOUNT_ID: "",
  R2_ACCESS_KEY_ID: "",
  R2_SECRET_ACCESS_KEY: "",
  R2_BUCKET_NAME: "",
  NEXT_PUBLIC_R2_PUBLIC_URL: "",
  DATABASE_URL: "",
  NEXT_PUBLIC_OBSERVABILITY_FEATURES: [],
  BETTERSTACK_TELEMETRY_SOURCE_TOKEN: "",
  BETTERSTACK_TELEMETRY_INGESTING_HOST: "",
  NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: "",
  GA4_PROPERTY_ID: "",
  GA4_CREDENTIALS_JSON: "",
  GOOGLE_PAGESPEED_API_KEY: "",
  NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
  NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
  DODO_PAYMENTS_API_KEY: "",
  DODO_PAYMENTS_WEBHOOK_KEY: "",
  DODO_PAYMENTS_RETURN_URL: "",
  DODO_PAYMENTS_ENVIRONMENT: "",
  DODO_CREDITS_PRODUCT_ID: "",
  NEXT_PUBLIC_DODO_PAYMENTS_URL: "",
  NEXT_PUBLIC_AI_ENABLED: "false",
  AI_GATEWAY_API_KEY: "",
  OPENAI_API_KEY: "",
  ANTHROPIC_API_KEY: "",
  GOOGLE_GENERATIVE_AI_API_KEY: "",
  OPENROUTER_API_KEY: "",
  OLLAMA_BASE_URL: "",
  OPENAI_COMPATIBLE_BASE_URL: "",
  N8N_WEBHOOK_URL: "",
  N8N_WEBHOOK_JWT_KEY: "",
  STRIPE_SECRET_KEY: "",
  STRIPE_WEBHOOK_SECRET: "",
};

const STEP_INDEX_BY_ID = new Map(
  WIZARD_STEPS.map((step, index) => [step.id, index]),
);

import { FeaturePanel } from "@workspace/ui/components/dashboard/FeaturePanel";
import { ModuleToggleCard } from "@workspace/ui/components/dashboard/ModuleToggleCard";
import { StepChip } from "@workspace/ui/components/dashboard/StepChip";
import { StartChoiceCard } from "@workspace/ui/components/dashboard/StartChoiceCard";
import { PresetJourney } from "@workspace/ui/components/dashboard/PresetJourney";
import { WizardSummary } from "@workspace/ui/components/dashboard/WizardSummary";

export default function DashboardPage({
  catalog,
  onSubmitConfiguration,
  onSaveConfiguration,
  docsBaseUrl = "",
  onNavigateDoc,
  renderPreview,
}: DashboardPageProps) {
  const isGuest = useIsGuest();
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedPreset, setSelectedPreset] =
    React.useState<ResolvedPreset | null>(null);
  const [presetProductTypeId, setPresetProductTypeId] =
    React.useState<ProductTypeId | null>(null);
  const [presetTierId, setPresetTierId] = React.useState<TierId>("tier-2");
  const [presetVersionId, setPresetVersionId] =
    React.useState<VersionId>("balanced");
  const [presetStage, setPresetStage] = React.useState<StageEstimate>({
    kind: "beta",
  });
  const [advancedMode, setAdvancedMode] = React.useState(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [entryChoice, setEntryChoice] = React.useState<EntryChoice>("manual");
  const [importedFieldCount, setImportedFieldCount] = React.useState(0);
  const [importedSecretCount, setImportedSecretCount] = React.useState(0);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULT_FORM_VALUES,
    mode: "onChange",
  });

  const values = form.watch();
  const pricing = React.useMemo(
    () =>
      quoteFromCatalog(
        catalog,
        (values.SELECTED_MODULES || []) as ScaffoldModuleId[],
      ),
    [catalog, values.SELECTED_MODULES],
  );
  // Unimplemented modules are hidden rather than offered as free no-ops.
  const availableModules = React.useMemo(
    () => catalog.modules.filter((module) => module.available),
    [catalog],
  );
  const accountGroups = React.useMemo(
    () => getAccountsProviderGroups(values),
    [values],
  );
  const advancedChoiceFields = new Set(
    WIZARD_STEPS.flatMap((step) => getWizardStepFields(step.id, values)),
  );
  const reviewSummary = React.useMemo(
    () => getReviewSummaryItems(values),
    [values],
  );

  const fieldLookup = React.useMemo(() => {
    const map = new Map<
      string,
      (typeof MODULE_CONFIG)[number]["fields"][number]
    >();
    for (const section of MODULE_CONFIG) {
      for (const field of section.fields) {
        map.set(field.name, field);
      }
    }
    return map;
  }, []);

  const validationSnapshot = React.useMemo(
    () => formSchema.safeParse(values),
    [values],
  );
  const issuePaths = React.useMemo(() => {
    if (validationSnapshot.success) return new Set<string>();
    return new Set(
      validationSnapshot.error.issues
        .map((issue) => issue.path[0])
        .filter((path): path is string => typeof path === "string"),
    );
  }, [validationSnapshot]);

  const completionByStep = React.useMemo(() => {
    return WIZARD_STEPS.reduce<Record<WizardStepId, boolean>>(
      (acc, step) => {
        if (step.id === "start") {
          acc[step.id] = true;
          return acc;
        }

        const requiredFields = getWizardStepFields(step.id, values).filter(
          (field) => isWizardFieldRequired(field, values),
        );

        acc[step.id] =
          requiredFields.length === 0 ||
          requiredFields.every(
            (field) =>
              isWizardFieldComplete(field, values) &&
              !issuePaths.has(field as string),
          );

        return acc;
      },
      {} as Record<WizardStepId, boolean>,
    );
  }, [issuePaths, values]);

  const missingRequiredFields = React.useMemo(() => {
    const fields = WIZARD_STEPS.flatMap((step) =>
      getWizardStepFields(step.id, values).filter((field) =>
        isWizardFieldRequired(field, values),
      ),
    );

    return Array.from(new Set(fields)).filter(
      (field) =>
        !isWizardFieldComplete(field, values) ||
        issuePaths.has(field as string),
    );
  }, [issuePaths, values]);

  const missingLabels = React.useMemo(
    () =>
      missingRequiredFields.map(
        (field) => getWizardFieldMeta(field)?.label ?? field,
      ),
    [missingRequiredFields],
  );

  const applyPreset = React.useCallback(
    (preset: ResolvedPreset) => {
      setSelectedPreset(preset);
      setEntryChoice("preset");

      for (const [key, value] of Object.entries(preset.values)) {
        form.setValue(key as keyof FormValues, value as never, {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      form.setValue("SELECTED_MODULES", preset.modules, {
        shouldDirty: true,
        shouldValidate: true,
      });

      setAdvancedMode(false);
      setCurrentStepIndex(STEP_INDEX_BY_ID.get("basics") ?? 1);
    },
    [form],
  );

  const toggleScaffoldModule = React.useCallback(
    (moduleId: ScaffoldModuleId) => {
      const currentModules = form.getValues("SELECTED_MODULES") || [];
      const nextModules = toggleModule(catalog, currentModules, moduleId);

      form.setValue("SELECTED_MODULES", nextModules, {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (moduleId === "billing" && !nextModules.includes("billing")) {
        form.setValue("NEXT_PUBLIC_PAYMENT_GATEWAY", "none", {
          shouldDirty: true,
          shouldValidate: true,
        });
      }
    },
    [catalog, form],
  );

  const openImportPicker = React.useCallback(() => {
    setEntryChoice("import");
    importInputRef.current?.click();
  }, []);

  const handleFileUpload = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        const content = loadEvent.target?.result as string;
        if (!content) return;

        const count = parseEnvFile(content, form.setValue);
        setImportedFieldCount(count);
        const importedKeys = content
          .split("\n")
          .map((line) => line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/))
          .filter((match) => match && match[2]!.trim().replace(/^["']|["']$/g, ""));
        setImportedSecretCount(
          importedKeys.filter((match) => isSecretEnvKey(match![1]!)).length,
        );
        setEntryChoice("import");
        setSelectedPreset(null);
      };
      reader.readAsText(file);
    },
    [form.setValue],
  );

  const getFirstStepForField = React.useCallback(
    (field: WizardFieldName) => {
      for (const step of WIZARD_STEPS) {
        if (getWizardStepFields(step.id, form.getValues()).includes(field)) {
          return STEP_INDEX_BY_ID.get(step.id) ?? 0;
        }
      }
      return 0;
    },
    [form],
  );

  const validateStep = React.useCallback(
    async (stepId: WizardStepId) => {
      const currentValues = form.getValues();
      const fields = getWizardStepFields(stepId, currentValues).filter(
        (field) => isWizardFieldRequired(field, currentValues),
      );

      if (fields.length === 0) return true;

      const schemaValid = await form.trigger(fields);

      let firstMissingField: WizardFieldName | null = null;

      for (const field of fields) {
        if (!isWizardFieldComplete(field, currentValues)) {
          form.setError(field, {
            type: "manual",
            message: "This is needed before you continue.",
          });
          firstMissingField ??= field;
        }
      }

      if (firstMissingField) {
        form.setFocus(firstMissingField);
        return false;
      }

      return schemaValid;
    },
    [form],
  );

  const handleNext = React.useCallback(async () => {
    const step = WIZARD_STEPS[currentStepIndex];
    if (!step) return;

    const valid = await validateStep(step.id);
    if (!valid) return;

    setCurrentStepIndex((prev) => Math.min(prev + 1, WIZARD_STEPS.length - 1));
  }, [currentStepIndex, validateStep]);

  const handleBack = React.useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const onSubmit = React.useCallback(
    async (submittedValues: FormValues) => {
      setIsDownloading(true);
      try {
        const safeName = submittedValues.name
          .trim()
          .replace(/[^\w.-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80);

        const envVars = buildEnvVarsFromForm(submittedValues);
        const modules = submittedValues.SELECTED_MODULES || [];
        await onSubmitConfiguration(
          safeName,
          envVars,
          modules,
          quoteFromCatalog(catalog, modules).totalCredits,
        );
      } finally {
        setIsDownloading(false);
      }
    },
    [catalog, onSubmitConfiguration],
  );

  const handleFinalDownload = React.useCallback(async () => {
    const currentValues = form.getValues();
    const fields = WIZARD_STEPS.flatMap((step) =>
      getWizardStepFields(step.id, currentValues).filter((field) =>
        isWizardFieldRequired(field, currentValues),
      ),
    );
    const dedupedFields = Array.from(new Set(fields));

    const schemaValid = await form.trigger(dedupedFields);

    const firstMissingField = dedupedFields.find(
      (field) => !isWizardFieldComplete(field, currentValues),
    );

    if (firstMissingField) {
      form.setError(firstMissingField, {
        type: "manual",
        message: "Please finish this field before downloading.",
      });
      setCurrentStepIndex(getFirstStepForField(firstMissingField));
      form.setFocus(firstMissingField);
      return;
    }

    if (!schemaValid) {
      const latestSnapshot = formSchema.safeParse(form.getValues());
      if (!latestSnapshot.success) {
        const firstIssue = latestSnapshot.error.issues.find(
          (issue) => typeof issue.path[0] === "string",
        );
        if (firstIssue && typeof firstIssue.path[0] === "string") {
          const field = firstIssue.path[0] as WizardFieldName;
          setCurrentStepIndex(getFirstStepForField(field));
          form.setFocus(field);
        }
      }
      return;
    }

    await onSubmit(form.getValues());
  }, [form, getFirstStepForField, onSubmit]);

  const handleSaveConfiguration = React.useCallback(async () => {
    if (!onSaveConfiguration) return;
    const values = form.getValues();
    const safeName = (values.name || "").trim();
    if (!safeName) {
      form.setError("name", {
        type: "manual",
        message: "Add a project name before saving.",
      });
      form.setFocus("name");
      return;
    }
    setIsSaving(true);
    try {
      await onSaveConfiguration({
        name: safeName,
        config: Object.fromEntries(
          Object.entries(values).filter(
            ([key]) => !isSecretEnvKey(key) && !SECRET_WIZARD_FIELDS.has(key as WizardFieldName),
          ),
        ),
        modules: values.SELECTED_MODULES || [],
        platforms: values.NEXT_PUBLIC_PLATFORM || ["web"],
        productTypeId: presetProductTypeId ?? undefined,
        tierId: presetTierId,
        versionId: presetVersionId,
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    onSaveConfiguration,
    form,
    presetProductTypeId,
    presetTierId,
    presetVersionId,
  ]);

  const renderWizardField = React.useCallback(
    (name: WizardFieldName, sectionId: string) => {
      const meta = getWizardFieldMeta(name);
      const fieldConfig = fieldLookup.get(name);

      return (
        <EnvField
          control={form.control}
          name={name}
          label={meta?.label}
          description={meta?.helper ?? fieldConfig?.description}
          required={isWizardFieldRequired(name, values)}
          sectionId={sectionId}
          providerHints={fieldConfig?.providerHints}
        />
      );
    },
    [fieldLookup, form.control, values],
  );

  const renderPresetJourney = () => (
    <PresetJourney
      productTypeId={presetProductTypeId}
      tierId={presetTierId}
      versionId={presetVersionId}
      stage={presetStage}
      appliedPresetId={selectedPreset?.id}
      onProductTypeChange={(productTypeId) => {
        setPresetProductTypeId(productTypeId);
        setPresetVersionId("balanced");
        setEntryChoice("preset");
      }}
      onTierChange={setPresetTierId}
      onVersionChange={setPresetVersionId}
      onStageChange={setPresetStage}
      onApply={applyPreset}
      onBack={() => setEntryChoice("manual")}
    />
  );

  const renderProviderChoice = () => (
    <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Only the providers you pick</p>
          <p className="text-xs text-muted-foreground">
            Your download keeps the payment gateway, image storage and CMS you
            chose. The others&apos; code, SDKs and env vars are left out. Keep
            them all to switch providers at runtime later.
          </p>
        </div>
        <Switch
          checked={values.KEEP_ALL_PROVIDERS === "true"}
          onCheckedChange={(checked) =>
            form.setValue("KEEP_ALL_PROVIDERS", checked ? "true" : "false", { shouldDirty: true })
          }
          aria-label="Keep every provider"
        />
      </div>
    </div>
  );

  const renderAdvancedMode = () => (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Advanced Setup</h2>
            <p className="text-sm text-muted-foreground">
              All setup choices in one view. Add credentials after download.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled
              onClick={() => {
                const url = buildVercelDeployUrl(form.getValues());
                window.open(url, "_blank", "noopener,noreferrer");
              }}
            >
              <Rocket className="mr-2 h-4 w-4" />
              <span className="whitespace-normal text-left">Deploy to Vercel (Coming Soon)</span>
            </Button>
            {onSaveConfiguration ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveConfiguration}
                disabled={isSaving || isGuest}
                className="touch-manipulation"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Saving…" : "Save configuration"}
              </Button>
            ) : null}
            <Button
              type="button"
              onClick={handleFinalDownload}
              disabled={isDownloading || isGuest}
              className="touch-manipulation"
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading ? "Downloading…" : "Download Boilerplate"}
            </Button>
          </div>
        </div>
      </div>

      {renderProviderChoice()}

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Optional Features</CardTitle>
          <CardDescription>
            Start with the lean base starter, then add heavier capabilities only
            when you want them in the ZIP.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {availableModules.map((module) => {
              const isSelected = (values.SELECTED_MODULES || []).includes(
                module.id,
              );

              return (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => toggleScaffoldModule(module.id)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/60 bg-background hover:border-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{module.label}</div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      +{module.creditsCost} credits
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {module.description}
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {isSelected ? "Selected" : "Optional"}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl bg-muted/40 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Scaffold pricing</p>
                <p className="text-xs text-muted-foreground">
                  Base starter costs {pricing.baseCredits} credits.
                </p>
              </div>
              <p className="text-lg font-semibold">
                {pricing.totalCredits} credits
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {MODULE_CONFIG.filter(
          (section) =>
            section.id === "project" ||
            section.fields.some((field) => advancedChoiceFields.has(field.name as WizardFieldName)),
        ).map((section) => {
          if (
            section.id === "payment" &&
            !(values.SELECTED_MODULES || []).includes("billing")
          ) {
            return null;
          }

          return (
            <Card
              key={section.id}
              className={cn(
                "min-w-0 border-border/60 shadow-sm",
                section.id === "project" && "xl:col-span-2",
              )}
            >
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <section.icon className={cn("h-5 w-5", section.color)} />
                    {section.title}
                  </span>
                  {section.documentation?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {section.documentation.map((doc) =>
                        onNavigateDoc ? (
                          <Button
                            key={doc.slug}
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onNavigateDoc(doc.slug)}
                          >
                            {doc.label}
                            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button
                            key={doc.slug}
                            type="button"
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`${docsBaseUrl}/landing/doc/${doc.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {doc.label}
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ),
                      )}
                    </div>
                  ) : null}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent
                className={cn(
                  "space-y-4",
                  section.id === "project" && "grid gap-4 md:grid-cols-2",
                )}
              >
                {section.id === "project" ? (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormControl>
                          <FloatingLabelInput
                            id="advanced-project-name"
                            label="Project Name (Folder Name)"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                {section.fields
                  .filter((field) => {
                    if (!advancedChoiceFields.has(field.name as WizardFieldName)) {
                      return false;
                    }
                    if (field.showIf) {
                      const dependencyValue = form.getValues(
                        field.showIf.field as keyof FormValues,
                      );
                      if (Array.isArray(field.showIf.value)) {
                        return field.showIf.value.includes(
                          dependencyValue as string,
                        );
                      }
                      return dependencyValue === field.showIf.value;
                    }

                    if (field.showIfIncludes) {
                      const dependencyValue = form.getValues(
                        field.showIfIncludes.field as keyof FormValues,
                      );
                      return (
                        Array.isArray(dependencyValue) &&
                        (dependencyValue as string[]).includes(
                          field.showIfIncludes.value as string,
                        )
                      );
                    }

                    return true;
                  })
                  .map((field) => (
                    <EnvField
                      key={field.name}
                      control={form.control}
                      name={field.name as keyof FormValues}
                      description={field.description}
                      required={field.required}
                      sectionId={section.id}
                      providerHints={field.providerHints}
                    />
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderWizardMode = () => {
    const currentStep = WIZARD_STEPS[currentStepIndex];
    if (!currentStep) return null;

    return (
      <div className="grid grid-cols-1 min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <div className="space-y-4">
            <div className="min-w-0">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {WIZARD_STEPS.map((step, index) => (
                  <StepChip
                    key={step.id}
                    step={step}
                    index={index}
                    currentStepIndex={currentStepIndex}
                    isComplete={completionByStep[step.id]}
                    onClick={() => setCurrentStepIndex(index)}
                  />
                ))}
              </div>
            </div>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">{currentStep.title}</CardTitle>
                <CardDescription>{currentStep.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {currentStep.id === "start" ? (
                  <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                      <StartChoiceCard
                        title="Import Existing Config"
                        description="Upload a .env file and let the wizard populate what it can."
                        icon={<FileUp className="h-5 w-5" />}
                        active={entryChoice === "import"}
                        onClick={openImportPicker}
                      />
                      <StartChoiceCard
                        title="Use a Preset"
                        description="Coming soon — presets are not available yet."
                        icon={<Sparkles className="h-5 w-5" />}
                        active={false}
                        disabled
                      />
                      <StartChoiceCard
                        title="Set Up Manually"
                        description="Build your own configuration step by step with beginner-friendly guidance."
                        icon={<Settings2 className="h-5 w-5" />}
                        active={entryChoice === "manual"}
                        onClick={() => {
                          setEntryChoice("manual");
                          setSelectedPreset(null);
                        }}
                      />
                    </div>

                    {importedFieldCount > 0 ? (
                      <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                        Imported {importedFieldCount} fields from your `.env`
                        file. You can still edit everything in the next steps.
                      </div>
                    ) : null}
                    {importedSecretCount > 0 ? (
                      <div className="flex items-start gap-2 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {importedSecretCount} secret value
                          {importedSecretCount === 1 ? "" : "s"} stay on this
                          device. They are added to your ZIP in the browser and
                          never sent to SaaS Forge.
                        </span>
                      </div>
                    ) : null}

                    {entryChoice === "preset" ? renderPresetJourney() : null}
                  </>
                ) : null}

                {currentStep.id === "basics" ? (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Card className="border-border/60 md:col-span-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Core Identity
                        </CardTitle>
                        <CardDescription>
                          These values shape the product name, URL, and visual
                          theme across the starter.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormControl>
                                <FloatingLabelInput
                                  id="wizard-project-name"
                                  label={
                                    getWizardFieldMeta("name")?.label ??
                                    "Project Name"
                                  }
                                  className="bg-background"
                                  {...field}
                                />
                              </FormControl>
                              <p className="text-xs text-muted-foreground">
                                {getWizardFieldMeta("name")?.helper}
                              </p>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {renderWizardField("NEXT_PUBLIC_SAAS_NAME", "basics")}
                        {renderWizardField(
                          "NEXT_PUBLIC_COMPANY_NAME",
                          "basics",
                        )}
                        {renderWizardField("NEXT_PUBLIC_URL", "basics")}
                        {renderWizardField("NEXT_PUBLIC_THEME", "basics")}
                        {renderWizardField("NEXT_PUBLIC_THEME_TYPE", "basics")}
                        <div className="md:col-span-2">
                          {renderWizardField("NEXT_PUBLIC_PLATFORM", "basics")}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {currentStep.id === "features" ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="lg:col-span-2">
                      <FeaturePanel
                        title="Optional Features"
                        question="Which paid capabilities should your scaffold include?"
                        description="Choose from every available module. Required modules are included automatically."
                      >
                        <div className="grid gap-3 md:grid-cols-2">
                          {availableModules.map((module) => (
                            <ModuleToggleCard
                              key={module.id}
                              module={module}
                              selected={(values.SELECTED_MODULES || []).includes(module.id)}
                              onToggle={() => toggleScaffoldModule(module.id)}
                            />
                          ))}
                        </div>
                      </FeaturePanel>
                    </div>

                    <FeaturePanel
                      title="Marketing Content"
                      question="How do you want to manage your landing page and docs?"
                      description="Pick the content source that matches how hands-on you want your team to be."
                    >
                      {renderWizardField("NEXT_PUBLIC_CMS", "features-cms")}
                    </FeaturePanel>

                    <FeaturePanel
                      title="User Sign-In"
                      question="How should people create accounts and sign in?"
                      description="Choose the login options your product should support from day one."
                    >
                      {renderWizardField(
                        "NEXT_PUBLIC_AUTH_PROVIDERS",
                        "features-auth",
                      )}
                    </FeaturePanel>

                    <FeaturePanel
                      title="Support Experience"
                      question="Do you want support email or booking links built in?"
                      description="Leave this empty if you want to keep support lightweight for now."
                    >
                      {renderWizardField(
                        "NEXT_PUBLIC_SUPPORT_FEATURES",
                        "features-support",
                      )}
                    </FeaturePanel>

                    <FeaturePanel
                      title="Uploaded Files"
                      question="Where should product images and uploaded assets live?"
                      description="Choose the asset storage provider that fits your scale and comfort level."
                    >
                      {renderWizardField(
                        "NEXT_PUBLIC_IMAGE_STORAGE",
                        "features-storage",
                      )}
                    </FeaturePanel>

                    <FeaturePanel
                      title="Monitoring & Protection"
                      question="Which operational extras do you want included?"
                      description="Turn on analytics, logging, or rate limiting only when you know you need them."
                    >
                      {renderWizardField(
                        "NEXT_PUBLIC_OBSERVABILITY_FEATURES",
                        "features-observability",
                      )}
                    </FeaturePanel>

                  </div>
                ) : null}

                {currentStep.id === "accounts" ? (
                  <div className="space-y-4">
                    {accountGroups.map((group: ProviderGroup) => (
                      <Card
                        key={group.id}
                        className="border-border/60 shadow-sm"
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">
                            {group.title}
                          </CardTitle>
                          <CardDescription>{group.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-2">
                          {group.fields.map((field) => (
                            <div
                              key={field}
                              className={cn(
                                field.endsWith("_TOKEN") ||
                                  field.endsWith("_SECRET") ||
                                  field === "DATABASE_URL" ||
                                  field.includes("KEY")
                                  ? "md:col-span-2"
                                  : "",
                              )}
                            >
                              {renderWizardField(field, group.id)}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : null}

                {currentStep.id === "review" ? (
                  <div className="space-y-4">
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          What You&apos;re Building
                        </CardTitle>
                        <CardDescription>
                          A quick, human-readable summary before download.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl border border-border/60 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Basics
                          </p>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                Project
                              </span>
                              <span className="font-medium">
                                {values.NEXT_PUBLIC_SAAS_NAME ||
                                  "Not named yet"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                Company
                              </span>
                              <span className="font-medium">
                                {values.NEXT_PUBLIC_COMPANY_NAME || "Not set"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">URL</span>
                              <span className="font-medium">
                                {values.NEXT_PUBLIC_URL || "Not set"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                Platforms
                              </span>
                              <span className="font-medium">
                                {formatList(values.NEXT_PUBLIC_PLATFORM || [])}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border/60 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Credits
                          </p>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                Base starter
                              </span>
                              <span className="font-medium">
                                {pricing.baseCredits} credits
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                Extra features
                              </span>
                              <span className="font-medium">
                                {pricing.moduleCredits.length > 0
                                  ? pricing.moduleCredits
                                      .map(
                                        (entry) =>
                                          `${entry.label} (+${entry.credits})`,
                                      )
                                      .join(", ")
                                  : "None"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-muted-foreground">
                                Total
                              </span>
                              <span className="text-lg font-semibold">
                                {pricing.totalCredits}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Chosen Capabilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 md:grid-cols-2">
                        {reviewSummary.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-2xl border border-border/60 p-4"
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="mt-2 text-sm font-medium">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          Connected Services
                        </CardTitle>
                        <CardDescription>
                          These are the accounts and providers this setup
                          currently depends on.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        {accountGroups.map((group) => (
                          <Badge key={group.id} variant="outline">
                            {group.title}
                          </Badge>
                        ))}
                      </CardContent>
                    </Card>

                    <Card
                      className={cn(
                        "shadow-sm",
                        missingLabels.length > 0
                          ? "border-amber-500/40 bg-amber-500/5"
                          : "border-emerald-500/40 bg-emerald-500/5",
                      )}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {missingLabels.length > 0 ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          ) : (
                            <Check className="h-4 w-4 text-emerald-500" />
                          )}
                          {missingLabels.length > 0
                            ? "Missing Before Download"
                            : "Ready to Download"}
                        </CardTitle>
                        <CardDescription>
                          {missingLabels.length > 0
                            ? "These are the remaining items still blocking a clean scaffold download."
                            : "The required setup details are filled in."}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {missingLabels.length > 0 ? (
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {missingLabels.map((label) => (
                              <li
                                key={label}
                                className="flex items-start gap-2"
                              >
                                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                                <span>{label}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            The wizard has enough information to generate your
                            scaffold.
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex flex-col gap-3 md:flex-row">
                      <Button
                        type="button"
                        onClick={handleFinalDownload}
                        disabled={
                          isDownloading || missingLabels.length > 0 || isGuest
                        }
                        size="lg"
                        className="touch-manipulation"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {isDownloading
                          ? "Downloading…"
                          : "Download Boilerplate"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        onClick={() => {
                          const url = buildVercelDeployUrl(form.getValues());
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        size="lg"
                      >
                        <Rocket className="mr-2 h-4 w-4" />
                        <span className="whitespace-normal text-left">Deploy to Vercel (Coming Soon)</span>
                      </Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStepIndex === 0}
            >
              Back
            </Button>
            {currentStep.id !== "review" &&
            !(currentStep.id === "start" && entryChoice === "preset") ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <WizardSummary
            currentStepIndex={currentStepIndex}
            completionByStep={completionByStep}
            selectedPreset={selectedPreset}
            entryChoice={entryChoice}
            pricing={pricing}
            values={values}
            missingLabels={missingLabels}
          />
          {renderProviderChoice()}
          {renderPreview?.({
            modules: (values.SELECTED_MODULES || []) as ScaffoldModuleId[],
            platforms: values.NEXT_PUBLIC_PLATFORM?.length ? values.NEXT_PUBLIC_PLATFORM : ["web"],
          })}
        </div>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        className="min-h-svh"
      >
        <input
          ref={importInputRef}
          type="file"
          accept=".env"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="mx-auto flex min-w-0 w-full max-w-7xl flex-col gap-8 p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <h1 className="page-title">
                Beginner-Friendly Scaffold Setup
              </h1>
              <p className="mt-2 text-base text-muted-foreground">
                Import an existing config, or walk through the setup one
                understandable step at a time.
              </p>
            </div>

            <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-muted p-2">
                  {advancedMode ? (
                    <Layers3 className="h-4 w-4 text-primary" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold">Advanced Setup</p>
                  <p className="text-xs text-muted-foreground">
                    View all setup choices on one page.
                  </p>
                </div>
                <Switch
                  checked={advancedMode}
                  onCheckedChange={setAdvancedMode}
                  aria-label="Toggle advanced scaffold setup"
                />
              </div>
            </div>
          </div>

          {advancedMode ? renderAdvancedMode() : renderWizardMode()}
        </div>
      </form>
    </Form>
  );
}
