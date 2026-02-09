"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Download,
  Upload,
  ExternalLink,
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
  FormDescription,
} from "@workspace/ui/components/shadcn/form";
import { Input } from "@workspace/ui/components/shadcn/input";
import { formSchema, FormValues } from "@/lib/zod/download";
import { FloatingLabelInput } from "@workspace/ui/components/misc/floating-label-input";

// Module Configuration
import { MODULE_CONFIG } from "@/lib/constants/module";
import EnvField from "@/components/home/EnvField";
import { useRouter } from "next/navigation";

export default function Page() {
  const [isDownloading, setIsDownloading] = React.useState(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      // Project Settings
      NEXT_PUBLIC_THEME: "neutral",
      NEXT_PUBLIC_THEME_TYPE: "system",
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
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <module.icon className={`h-5 w-5 ${module.color}`} /> {module.title}
                    </div>
                    {module.documentation && module.documentation.length > 0 && (
                      <div className="flex items-center gap-2">
                        {module.documentation.map((doc, idx) => (
                          <Button key={idx} variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary" asChild>
                            <a href={process.env.NEXT_PUBLIC_URL + "/landing/doc/" + doc.slug} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                              <span className="text-xs">{doc.label}</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
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
                  {module.fields.map((field) => (
                    <EnvField
                      key={field.name}
                      control={form.control}
                      name={field.name as keyof FormValues}
                      description={field.description}
                    />
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
