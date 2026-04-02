"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Download,
    Upload,
    ExternalLink,
    Rocket,
    Check,
    Clock,
    DollarSign,
    ListChecks,
    ChevronDown,
    ChevronUp,
    Sparkles,
    X,
    Users,
    AlertTriangle,
    ArrowUpRight,
    TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
import { Input } from "@workspace/ui/components/shadcn/input";
import { formSchema, FormValues } from "../../lib/zod/download";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";
import { cn } from "../../lib/utils";

// Module Configuration
import { MODULE_CONFIG } from "../../lib/constants/module";
import { PRESETS, PresetInfo } from "../../lib/constants/presets";
import EnvField from "../../components/home/EnvField";

import { buildEnvVarsFromForm, buildVercelDeployUrl, parseEnvFile } from "../../lib/utils/scaffold";

interface DashboardPageProps {
    onSubmitConfiguration: (safeName: string, envVars: Record<string, string>) => Promise<void>;
    docsBaseUrl?: string; // e.g. process.env.NEXT_PUBLIC_URL
    onNavigateDoc?: (slug: string) => void; // in-app doc navigation (desktop)
}

export default function DashboardPage({ onSubmitConfiguration, docsBaseUrl = "", onNavigateDoc }: DashboardPageProps) {
    const [isDownloading, setIsDownloading] = React.useState(false);
    const [selectedPreset, setSelectedPreset] = React.useState<PresetInfo | null>(null);
    const [expandedSteps, setExpandedSteps] = React.useState<Set<number>>(new Set());

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            NEXT_PUBLIC_THEME: "neutral",
            NEXT_PUBLIC_THEME_TYPE: "system",
            NEXT_PUBLIC_SAAS_NAME: "",
            NEXT_PUBLIC_COMPANY_NAME: "",
            NEXT_PUBLIC_URL: "",
            NEXT_PUBLIC_PLATFORM: ["web"],
            NEXT_PUBLIC_CMS: "notion",
            LANDING_DATABASE_ID: "",
            HERO_DATABASE_ID: "",
            FEATURE_DATABASE_ID: "",
            TESTIMONIAL_DATABASE_ID: "",
            PRICING_DATABASE_ID: "",
            FAQ_DATABASE_ID: "",
            FOOTER_DATABASE_ID: "",
            DOCUMENTATION_DATABASE_ID: "",
            NOTION_API_TOKEN: "",
            UPSTASH_REDIS_REST_URL: "",
            UPSTASH_REDIS_REST_TOKEN: "",
            NEXT_PUBLIC_AUTH_FRAMEWORK: "better-auth",
            BETTER_AUTH_SECRET: "",
            NEXT_PUBLIC_AUTH_PROVIDERS: [] as ("email_verification" | "linkedin" | "google" | "github")[],
            AUTH_LINKEDIN_CLIENT_ID: "",
            AUTH_LINKEDIN_CLIENT_SECRET: "",
            AUTH_GITHUB_CLIENT_ID: "",
            AUTH_GITHUB_CLIENT_SECRET: "",
            AUTH_GOOGLE_CLIENT_ID: "",
            AUTH_GOOGLE_CLIENT_SECRET: "",
            NEXT_PUBLIC_EMAIL_CLIENT: "none",
            RESEND_API_KEY: "",
            NEXT_PUBLIC_SUPPORT_FEATURES: [] as ("support_mail" | "calendly")[],
            NEXT_PUBLIC_SUPPORT_MAIL: "",
            NEXT_PUBLIC_CALENDLY_BOOKING_URL: "",
            NEXT_PUBLIC_IMAGE_STORAGE: "vercel_blob",
            BLOB_READ_WRITE_TOKEN: "",
            DATABASE_URL: "",
            NEXT_PUBLIC_OBSERVABILITY_FEATURES: [] as ("logging" | "google_analytics" | "rate_limiting")[],
            BETTERSTACK_TELEMETRY_SOURCE_TOKEN: "",
            BETTERSTACK_TELEMETRY_INGESTING_HOST: "",
            NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: "",
            NEXT_PUBLIC_ALLOW_RATE_LIMIT: "upstash",
            NEXT_PUBLIC_PAYMENT_GATEWAY: "none",
            DODO_PAYMENTS_API_KEY: "",
            DODO_PAYMENTS_WEBHOOK_KEY: "",
            DODO_PAYMENTS_RETURN_URL: "",
            DODO_PAYMENTS_ENVIRONMENT: "",
            DODO_CREDITS_PRODUCT_ID: "",
            NEXT_PUBLIC_DODO_PAYMENTS_URL: "",
        },
        mode: "onChange",
    });

    const watchedSupportMail = form.watch("NEXT_PUBLIC_SUPPORT_MAIL");
    const watchedAuthProviders = form.watch("NEXT_PUBLIC_AUTH_PROVIDERS");
    const watchedEmailClient = form.watch("NEXT_PUBLIC_EMAIL_CLIENT");
    const watchedPaymentGateway = form.watch("NEXT_PUBLIC_PAYMENT_GATEWAY");

    React.useEffect(() => {
        form.trigger("NEXT_PUBLIC_EMAIL_CLIENT");
    }, [watchedSupportMail, watchedAuthProviders]);

    React.useEffect(() => {
        form.trigger("RESEND_API_KEY");
    }, [watchedEmailClient]);

    React.useEffect(() => {
        form.trigger(["DODO_PAYMENTS_API_KEY", "DODO_PAYMENTS_WEBHOOK_KEY", "DODO_PAYMENTS_RETURN_URL", "DODO_PAYMENTS_ENVIRONMENT", "DODO_CREDITS_PRODUCT_ID", "NEXT_PUBLIC_DODO_PAYMENTS_URL"]);
    }, [watchedPaymentGateway]);

    const onSubmit = async (values: FormValues) => {
        setIsDownloading(true);
        try {
            const safeName = values.name
                .trim()
                .replace(/[^\w.-]+/g, "-")
                .replace(/^-+|-+$/g, "")
                .slice(0, 80);

            const envVars = buildEnvVarsFromForm(values);

            await onSubmitConfiguration(safeName, envVars);
        } catch (error) {
            console.error("Download failed:", error);
        } finally {
            setIsDownloading(false);
        }
    };

    const applyPreset = (preset: PresetInfo) => {
        const isDeselecting = selectedPreset?.id === preset.id;
        if (isDeselecting) {
            setSelectedPreset(null);
            setExpandedSteps(new Set());
            return;
        }
        setSelectedPreset(preset);
        setExpandedSteps(new Set());

        // Apply all non-secret preset values to the form
        for (const [key, value] of Object.entries(preset.values)) {
            form.setValue(key as keyof FormValues, value as any, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            if (!content) return;

            const count = parseEnvFile(content, form.setValue);
            console.log(`Auto-filled ${count} fields from .env file`);
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex flex-col min-h-svh p-6 md:p-8 space-y-8 max-w-8xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                        Configure Your SaaS Stack
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-lg">
                        Customize your boilerplate settings and download a production-ready monorepo.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={!form.formState.isValid || isDownloading}
                        size="lg"
                        className="shadow-lg hover:shadow-xl transition-all"
                    >
                        {isDownloading ? (
                            <>Downloading...</>
                        ) : (
                            <>
                                <Download className="mr-2 h-4 w-4" /> Download Boilerplate
                            </>
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        disabled={true}
                        className="shadow-lg hover:shadow-xl transition-all"
                        onClick={() => {
                            const url = buildVercelDeployUrl(form.getValues());
                            window.open(url, "_blank", "noopener,noreferrer");
                        }}
                    >
                        <Rocket className="mr-2 h-4 w-4" /> Deploy to Vercel (Coming Soon)
                    </Button>
                </div>
            </div>

            {/* Upload Zone */}
            <div className="relative group rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 transition-colors bg-muted/30 p-8 text-center cursor-pointer">
                <Input
                    id="env-import"
                    type="file"
                    accept=".env"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <div className="p-3 bg-background rounded-full shadow-sm">
                        <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">Import .env Configuration</p>
                    <p className="text-sm text-muted-foreground">Drag and drop or click to upload your .env file to auto-fill fields.</p>
                </div>
            </div>

            {/* ── Preset Strategy Selector ─────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">Quick Start Presets</h2>
                    <span className="text-sm text-muted-foreground">— pick a strategy to auto-fill the form</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {PRESETS.map((preset) => {
                        const isActive = selectedPreset?.id === preset.id;
                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className={cn(
                                    "relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer text-center",
                                    isActive
                                        ? `${preset.bgColor} shadow-md scale-[1.02]`
                                        : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40 hover:shadow-sm"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute top-2 right-2">
                                        <Check className="h-4 w-4 text-primary" />
                                    </div>
                                )}
                                <preset.icon className={cn("h-6 w-6", preset.color)} />
                                <span className="text-sm font-semibold leading-tight">{preset.name}</span>
                                <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{preset.tagline}</span>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={cn(
                                        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none",
                                        preset.estimatedCost === "$0/mo"
                                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                    )}>
                                        <DollarSign className="h-2.5 w-2.5" />
                                        {preset.estimatedCost}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold leading-none bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                        <Clock className="h-2.5 w-2.5" />
                                        {preset.setupTime}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* ── Selected Preset Detail Panel ──────────────────────── */}
                <AnimatePresence mode="wait">
                    {selectedPreset && (
                        <motion.div
                            key={selectedPreset.id}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: "easeOut" }}
                        >
                            <Card className={cn("border-l-4 shadow-sm", selectedPreset.bgColor.split(" ")[0])}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <selectedPreset.icon className={cn("h-5 w-5", selectedPreset.color)} />
                                            {selectedPreset.name}
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPreset(null); setExpandedSteps(new Set()); }}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </CardTitle>
                                    <CardDescription>{selectedPreset.tagline}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Cost / Time / MAU / Steps row */}
                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                                            <DollarSign className="h-4 w-4 text-emerald-500" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Est. Cost</p>
                                                <p className="text-sm font-bold">{selectedPreset.estimatedCost}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                                            <Clock className="h-4 w-4 text-blue-500" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Setup Time</p>
                                                <p className="text-sm font-bold">{selectedPreset.setupTime}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                                            <Users className="h-4 w-4 text-orange-500" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Est. MAU</p>
                                                <p className="text-sm font-bold">{selectedPreset.capacity.estimatedMAU}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                                            <ListChecks className="h-4 w-4 text-purple-500" />
                                            <div>
                                                <p className="text-[10px] text-muted-foreground uppercase font-medium">Steps</p>
                                                <p className="text-sm font-bold">{selectedPreset.steps.length} steps</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* First Bottleneck Warning */}
                                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">First Bottleneck</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{selectedPreset.capacity.firstBottleneck}</p>
                                        </div>
                                    </div>

                                    {/* What's included */}
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">What&apos;s Included</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedPreset.highlights.map((h, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                                    <Check className="h-3 w-3" /> {h}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Accounts Needed */}
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Accounts You&apos;ll Need ({selectedPreset.accountsNeeded.length})</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedPreset.accountsNeeded.map((account, i) => (
                                                <span key={i} className="inline-flex items-center px-2 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium border border-border/50">
                                                    {account}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Service Limits Table */}
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Service Limits</p>
                                        <div className="rounded-lg border border-border/60 overflow-hidden">
                                            <div className="grid grid-cols-[1fr_2fr] text-[11px] font-semibold text-muted-foreground uppercase bg-muted/40 px-3 py-1.5 border-b border-border/40">
                                                <span>Service</span>
                                                <span>Limit</span>
                                            </div>
                                            {selectedPreset.capacity.serviceLimits.map((sl, i) => (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "grid grid-cols-[1fr_2fr] px-3 py-2 text-xs border-b border-border/20 last:border-b-0",
                                                        sl.bottleneck && "bg-amber-500/5"
                                                    )}
                                                >
                                                    <span className={cn(
                                                        "font-medium",
                                                        sl.bottleneck ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                                                    )}>
                                                        {sl.service}
                                                        {sl.bottleneck && <AlertTriangle className="inline h-3 w-3 ml-1 -mt-0.5" />}
                                                    </span>
                                                    <span className="text-muted-foreground">{sl.limit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Upgrade Guide */}
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                                            <TrendingUp className="h-3.5 w-3.5" /> How to Scale Beyond This
                                        </p>
                                        <div className="space-y-1.5">
                                            {selectedPreset.capacity.upgradeGuide.map((guide, i) => (
                                                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                    <ArrowUpRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                                    <span>{guide}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Implementation Steps Accordion */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase">Implementation Steps</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (expandedSteps.size === selectedPreset.steps.length) {
                                                        setExpandedSteps(new Set());
                                                    } else {
                                                        setExpandedSteps(new Set(selectedPreset.steps.map((_, i) => i)));
                                                    }
                                                }}
                                                className="text-[11px] text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors"
                                            >
                                                {expandedSteps.size === selectedPreset.steps.length ? "Collapse All" : "Expand All"}
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {selectedPreset.steps.map((step, i) => {
                                                const isExpanded = expandedSteps.has(i);
                                                return (
                                                    <div key={i} className="rounded-lg border border-border/60 overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setExpandedSteps(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(i)) next.delete(i);
                                                                    else next.add(i);
                                                                    return next;
                                                                });
                                                            }}
                                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors cursor-pointer"
                                                        >
                                                            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full bg-primary/15 text-primary text-xs font-bold">
                                                                {i + 1}
                                                            </span>
                                                            <span className="flex-1 text-sm font-medium">{step.title}</span>
                                                            {isExpanded
                                                                ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                                : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                            }
                                                        </button>
                                                        <AnimatePresence>
                                                            {isExpanded && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: "auto", opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                                >
                                                                    <ul className="px-3 pb-3 pl-12 space-y-1.5">
                                                                        {step.details.map((detail, j) => (
                                                                            <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                                                <span className="mt-1.5 h-1 w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
                                                                                <span>{detail}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground italic">
                                        Form fields below have been auto-filled. Fill in your API keys and secrets, then download.
                                    </p>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                        {MODULE_CONFIG.map((module) => (
                            <Card key={module.id} className={`shadow-sm border-border/60 border-l-4 ${module.borderColor} ${module.id === "project" ? "xl:col-span-2" : ""}`}>
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <module.icon className={`h-5 w-5 ${module.color}`} /> {module.title}
                                        </div>
                                        {module.documentation && module.documentation.length > 0 && (
                                            <div className="flex items-center gap-2">
                                                {module.documentation.map((doc, idx) => (
                                                    onNavigateDoc ? (
                                                        <Button key={idx} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" onClick={() => onNavigateDoc(doc.slug)}>
                                                            <span className="text-xs">{doc.label}</span>
                                                            <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                                                        </Button>
                                                    ) : (
                                                        <Button key={idx} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" asChild>
                                                            <a href={(docsBaseUrl || "") + "/landing/doc/" + doc.slug} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                                                                <span className="text-xs">{doc.label}</span>
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        </Button>
                                                    )
                                                ))}
                                            </div>
                                        )}
                                    </CardTitle>
                                    <CardDescription>{module.description}</CardDescription>
                                </CardHeader>
                                <CardContent className={`space-y-4 ${module.id === "project" ? "grid md:grid-cols-2 gap-4 space-y-0" : ""}`}>
                                    {module.id === "project" && (
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="col-span-2">
                                                    <FormControl>
                                                        <FloatingLabelInput id="projectName" label="Project Name (Folder Name)" className="bg-background" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    )}
                                    <AnimatePresence mode="popLayout">
                                        {module.fields
                                            .filter((field) => {
                                                if (field.showIf) {
                                                    const dependencyValue = form.watch(field.showIf.field as keyof FormValues);
                                                    if (Array.isArray(field.showIf.value)) {
                                                        if (!field.showIf.value.includes(dependencyValue as string)) return false;
                                                    } else {
                                                        if (dependencyValue !== field.showIf.value) return false;
                                                    }
                                                }
                                                if (field.showIfIncludes) {
                                                    const dependencyValue = form.watch(field.showIfIncludes.field as keyof FormValues);
                                                    if (!Array.isArray(dependencyValue) || !(dependencyValue as string[]).includes(field.showIfIncludes.value)) return false;
                                                }
                                                return true;
                                            })
                                            .map((field) => (
                                                <motion.div
                                                    key={field.name}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                                >
                                                    <EnvField
                                                        control={form.control}
                                                        name={field.name as keyof FormValues}
                                                        description={field.description}
                                                        required={field.required}
                                                        sectionId={module.id}
                                                        providerHints={field.providerHints}
                                                    />
                                                </motion.div>
                                            ))}
                                    </AnimatePresence>
                                </CardContent>
                            </Card>
                        ))}

                    </div>
                </form>
            </Form>
        </div>
    );
}
