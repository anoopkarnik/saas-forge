"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  Upload,
  Package,
  Lock,
  CreditCard,
  Database,
  LayoutTemplate,
  Activity,
  LifeBuoy,
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
  FormLabel,
  FormMessage,
  FormDescription,
} from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { formSchema, FormValues } from "@/lib/zod/download";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";

// Module Configuration
const MODULE_CONFIG = [
  {
    id: "project",
    title: "Project Settings",
    icon: Package,
    color: "text-blue-500",
    description: "Core settings for your application identity.",
    fields: [
      "NEXT_PUBLIC_THEME",
      "NEXT_PUBLIC_SAAS_NAME",
      "NEXT_PUBLIC_COMPANY_NAME",
      "NEXT_PUBLIC_URL",
    ] as const,
  },
  {
    id: "landing",
    title: "Landing Module",
    icon: LayoutTemplate,
    color: "text-purple-500",
    description: "Notion-backed CMS content.",
    fields: [
      "LANDING_DATABASE_ID",
      "HERO_DATABASE_ID",
      "FEATURE_DATABASE_ID",
      "TESTIMONIAL_DATABASE_ID",
      "PRICING_DATABASE_ID",
      "FAQ_DATABASE_ID",
      "FOOTER_DATABASE_ID",
      "DOCUMENTATION_DATABASE_ID",
      "NOTION_API_TOKEN",
    ] as const,
  },
  {
    id: "auth",
    title: "Authentication Module",
    icon: Lock,
    color: "text-amber-500",
    description: "BetterAuth & OAuth providers.",
    fields: [
      "BETTER_AUTH_SECRET",
      "AUTH_LINKEDIN_CLIENT_ID",
      "AUTH_LINKEDIN_CLIENT_SECRET",
      "AUTH_GITHUB_CLIENT_ID",
      "AUTH_GITHUB_CLIENT_SECRET",
      "AUTH_GOOGLE_CLIENT_ID",
      "AUTH_GOOGLE_CLIENT_SECRET",
      "RESEND_API_KEY",
    ] as const,
  },
  {
    id: "support",
    title: "Support Module",
    icon: LifeBuoy,
    color: "text-rose-500",
    description: "Support email and booking.",
    fields: [
      "NEXT_PUBLIC_SUPPORT_MAIL",
      "NEXT_PUBLIC_CALENDLY_BOOKING_URL",
    ] as const,
  },
  {
    id: "storage",
    title: "Storage Module",
    icon: Database,
    color: "text-cyan-500",
    description: "Postgres, Redis, and Blob storage.",
    fields: [
      "BLOB_READ_WRITE_TOKEN",
      "DATABASE_URL",
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_TOKEN",
    ] as const,
  },
  {
    id: "observability",
    title: "Observability Module",
    icon: Activity,
    color: "text-orange-500",
    description: "Telemetry and analytics.",
    fields: [
      "BETTERSTACK_TELEMETRY_SOURCE_TOKEN",
      "BETTERSTACK_TELEMETRY_INGESTING_HOST",
      "NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID",
    ] as const,
  },
  {
    id: "payment",
    title: "Payment Module",
    icon: CreditCard,
    color: "text-green-500",
    description: "Dodo Payments configuration.",
    fields: [
      "DODO_PAYMENTS_API_KEY",
      "DODO_PAYMENTS_WEBHOOK_KEY",
      "DODO_PAYMENTS_RETURN_URL",
      "DODO_PAYMENTS_ENVIRONMENT",
      "DODO_CREDITS_PRODUCT_ID",
      "NEXT_PUBLIC_DODO_PAYMENTS_URL",
    ] as const,
  },
];

// Helper component for env var fields
function EnvField({
  control,
  name,
  label,
}: {
  control: any;
  name: keyof FormValues;
  label?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel className="text-xs font-medium text-muted-foreground">{label}</FormLabel>}
          <FormControl>
            <FloatingLabelInput
              id={name}
              label={name}
              className="bg-background"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default function Page() {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      // Project Settings
      NEXT_PUBLIC_THEME: "",
      NEXT_PUBLIC_SAAS_NAME: "",
      NEXT_PUBLIC_COMPANY_NAME: "",
      NEXT_PUBLIC_URL: "",
      // Landing Module
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
      // Authentication Module
      BETTER_AUTH_SECRET: "",
      AUTH_LINKEDIN_CLIENT_ID: "",
      AUTH_LINKEDIN_CLIENT_SECRET: "",
      AUTH_GITHUB_CLIENT_ID: "",
      AUTH_GITHUB_CLIENT_SECRET: "",
      AUTH_GOOGLE_CLIENT_ID: "",
      AUTH_GOOGLE_CLIENT_SECRET: "",
      RESEND_API_KEY: "",
      // Support Module
      NEXT_PUBLIC_SUPPORT_MAIL: "",
      NEXT_PUBLIC_CALENDLY_BOOKING_URL: "",
      // Storage Module
      BLOB_READ_WRITE_TOKEN: "",
      DATABASE_URL: "",
      // Observability Module
      BETTERSTACK_TELEMETRY_SOURCE_TOKEN: "",
      BETTERSTACK_TELEMETRY_INGESTING_HOST: "",
      NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID: "",
      // Payment Module
      DODO_PAYMENTS_API_KEY: "",
      DODO_PAYMENTS_WEBHOOK_KEY: "",
      DODO_PAYMENTS_RETURN_URL: "",
      DODO_PAYMENTS_ENVIRONMENT: "",
      DODO_CREDITS_PRODUCT_ID: "",
      NEXT_PUBLIC_DODO_PAYMENTS_URL: "",
    },
    mode: "onChange",
  });

  const onSubmit = async (values: FormValues) => {
    setIsDownloading(true);
    try {
      const safeName = values.name
        .trim()
        .replace(/[^\w.-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);

      // Collect all non-empty env vars
      const envVars: Record<string, string> = {};
      const envKeys = Object.keys(values).filter((k) => k !== "name") as (keyof FormValues)[];

      for (const key of envKeys) {
        const value = values[key];
        if (value && typeof value === "string" && value.trim()) {
          envVars[key] = value;
        }
      }

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
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split("\n");
      let count = 0;

      lines.forEach((line) => {
        if (line.startsWith("#") || !line.trim()) return;
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (match) {
          const key = match[1];
          const rawValue = match[2];
          if (!key || rawValue === undefined) return;

          let value = rawValue.trim();
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          if (key in formSchema.shape) {
            form.setValue(key as keyof FormValues, value, {
              shouldDirty: true,
              shouldValidate: true,
            });
            count++;
          }
        }
      });
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

            {MODULE_CONFIG.map((module) => (
              <Card key={module.id} className={`shadow-sm border-border/60 ${module.id === "project" ? "md:col-span-2" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <module.icon className={`h-5 w-5 ${module.color}`} /> {module.title}
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
                          <FormDescription>Allowed: letters, numbers, . - _</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  {module.fields.map((fieldName) => (
                    <EnvField key={fieldName} control={form.control} name={fieldName as keyof FormValues} />
                  ))}
                </CardContent>
              </Card>
            ))}

          </div>
        </form>
      </Form>
    </div>
  );
}
