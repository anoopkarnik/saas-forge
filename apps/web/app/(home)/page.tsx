"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/shadcn/accordion";
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

// Helper component for env var fields
function EnvField({
  control,
  name,
  placeholder
}: {
  control: any;
  name: keyof FormValues;
  placeholder?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="font-mono text-xs">{name}</FormLabel>
          <FormControl>
            <Input placeholder={placeholder ?? `Enter ${name}`} {...field} />
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
      const envKeys = Object.keys(values).filter(k => k !== "name") as (keyof FormValues)[];

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

          // Remove wrapping quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          // Check if key exists in formSchema
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
    <div className="flex min-h-svh p-4">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold">Download Turborepo Starter</h1>
        <p className="text-muted-foreground mt-2">
          Give your project a name and configure environment variables. I'll package the full monorepo as a ZIP with a ready-to-use .env file.
        </p>

        <div className="mt-6 p-4 border rounded-lg bg-muted/50 space-y-2">
          <label htmlFor="env-import" className="text-sm font-medium">
            Auto-fill from .env file
          </label>
          <Input
            id="env-import"
            type="file"
            accept=".env"
            onChange={handleFileUpload}
            className="bg-background"
          />
          <p className="text-xs text-muted-foreground">
            Upload a .env file to automatically populate matching fields below.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Accordion type="multiple" defaultValue={["project"]}>
              {/* Project Name */}
              <AccordionItem value="project">
                <AccordionTrigger>Project Settings</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project name (folder name)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. anoop-saas-starter" {...field} />
                        </FormControl>
                        <FormDescription>
                          Allowed: letters, numbers, <span className="font-mono">.</span>{" "}
                          <span className="font-mono">_</span>{" "}
                          <span className="font-mono">-</span>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <EnvField control={form.control} name="NEXT_PUBLIC_THEME" placeholder="e.g. dark or light" />
                  <EnvField control={form.control} name="NEXT_PUBLIC_SAAS_NAME" placeholder="e.g. MySaaS" />
                  <EnvField control={form.control} name="NEXT_PUBLIC_COMPANY_NAME" placeholder="e.g. MyCompany Inc." />
                  <EnvField control={form.control} name="NEXT_PUBLIC_URL" placeholder="e.g. https://example.com" />
                </AccordionContent>
              </AccordionItem>

              {/* Landing Module */}
              <AccordionItem value="landing">
                <AccordionTrigger>Landing Module</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Notion database IDs and Redis cache configuration for landing pages.
                  </p>
                  <EnvField control={form.control} name="LANDING_DATABASE_ID" placeholder="Notion database ID" />
                  <EnvField control={form.control} name="HERO_DATABASE_ID" placeholder="Hero section database ID" />
                  <EnvField control={form.control} name="FEATURE_DATABASE_ID" placeholder="Features database ID" />
                  <EnvField control={form.control} name="TESTIMONIAL_DATABASE_ID" placeholder="Testimonials database ID" />
                  <EnvField control={form.control} name="PRICING_DATABASE_ID" placeholder="Pricing database ID" />
                  <EnvField control={form.control} name="FAQ_DATABASE_ID" placeholder="FAQ database ID" />
                  <EnvField control={form.control} name="FOOTER_DATABASE_ID" placeholder="Footer database ID" />
                  <EnvField control={form.control} name="DOCUMENTATION_DATABASE_ID" placeholder="Docs database ID" />
                  <EnvField control={form.control} name="NOTION_API_TOKEN" placeholder="Notion API secret token" />
                  <EnvField control={form.control} name="UPSTASH_REDIS_REST_URL" placeholder="Upstash Redis REST URL" />
                  <EnvField control={form.control} name="UPSTASH_REDIS_REST_TOKEN" placeholder="Upstash Redis REST token" />
                </AccordionContent>
              </AccordionItem>

              {/* Authentication Module */}
              <AccordionItem value="auth">
                <AccordionTrigger>Authentication Module</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Better Auth configuration and OAuth provider credentials.
                  </p>
                  <EnvField control={form.control} name="BETTER_AUTH_SECRET" placeholder="Generate a secure secret" />
                  <EnvField control={form.control} name="AUTH_LINKEDIN_CLIENT_ID" placeholder="LinkedIn OAuth client ID" />
                  <EnvField control={form.control} name="AUTH_LINKEDIN_CLIENT_SECRET" placeholder="LinkedIn OAuth client secret" />
                  <EnvField control={form.control} name="AUTH_GITHUB_CLIENT_ID" placeholder="GitHub OAuth client ID" />
                  <EnvField control={form.control} name="AUTH_GITHUB_CLIENT_SECRET" placeholder="GitHub OAuth client secret" />
                  <EnvField control={form.control} name="AUTH_GOOGLE_CLIENT_ID" placeholder="Google OAuth client ID" />
                  <EnvField control={form.control} name="AUTH_GOOGLE_CLIENT_SECRET" placeholder="Google OAuth client secret" />
                  <EnvField control={form.control} name="RESEND_API_KEY" placeholder="Resend API key for emails" />
                </AccordionContent>
              </AccordionItem>

              {/* Support Module */}
              <AccordionItem value="support">
                <AccordionTrigger>Support Module</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Customer support email and booking configuration.
                  </p>
                  <EnvField control={form.control} name="NEXT_PUBLIC_SUPPORT_MAIL" placeholder="e.g. support@example.com" />
                  <EnvField control={form.control} name="NEXT_PUBLIC_CALENDLY_BOOKING_URL" placeholder="Calendly booking URL" />
                </AccordionContent>
              </AccordionItem>

              {/* Storage Module */}
              <AccordionItem value="storage">
                <AccordionTrigger>Storage Module</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Database and blob storage configuration.
                  </p>
                  <EnvField control={form.control} name="DATABASE_URL" placeholder="PostgreSQL connection string" />
                  <EnvField control={form.control} name="BLOB_READ_WRITE_TOKEN" placeholder="Vercel Blob storage token" />
                </AccordionContent>
              </AccordionItem>

              {/* Observability Module */}
              <AccordionItem value="observability">
                <AccordionTrigger>Observability Module</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Logging, monitoring, and analytics configuration.
                  </p>
                  <EnvField control={form.control} name="BETTERSTACK_TELEMETRY_SOURCE_TOKEN" placeholder="BetterStack source token" />
                  <EnvField control={form.control} name="BETTERSTACK_TELEMETRY_INGESTING_HOST" placeholder="BetterStack ingesting host" />
                  <EnvField control={form.control} name="NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENT_ID" placeholder="e.g. G-XXXXXXXXXX" />
                </AccordionContent>
              </AccordionItem>

              {/* Payment Module */}
              <AccordionItem value="payment">
                <AccordionTrigger>Payment Module</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <p className="text-sm text-muted-foreground mb-4">
                    Dodo Payments configuration for billing and subscriptions.
                  </p>
                  <EnvField control={form.control} name="DODO_PAYMENTS_API_KEY" placeholder="Dodo Payments API key" />
                  <EnvField control={form.control} name="DODO_PAYMENTS_WEBHOOK_KEY" placeholder="Webhook signing key" />
                  <EnvField control={form.control} name="DODO_PAYMENTS_RETURN_URL" placeholder="Return URL after payment" />
                  <EnvField control={form.control} name="DODO_PAYMENTS_ENVIRONMENT" placeholder="e.g. live or test" />
                  <EnvField control={form.control} name="DODO_CREDITS_PRODUCT_ID" placeholder="Credits product ID" />
                  <EnvField control={form.control} name="NEXT_PUBLIC_DODO_PAYMENTS_URL" placeholder="Dodo Payments dashboard URL" />
                </AccordionContent>
              </AccordionItem>

              {/* Notes */}
              <AccordionItem value="notes">
                <AccordionTrigger>Notes</AccordionTrigger>
                <AccordionContent>
                  <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
                    <li>
                      This downloads a ZIP containing your full Turborepo structure (
                      <span className="font-mono">apps/</span>, <span className="font-mono">packages/</span>, etc.)
                      under a root folder named after your project.
                    </li>
                    <li>
                      A <span className="font-mono">.env</span> file will be generated with the values you provide above.
                    </li>
                    <li>
                      Leave any field empty to use the default placeholder value from <span className="font-mono">.env.example</span>.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center pt-4">
              <Button type="submit" disabled={!form.formState.isValid || isDownloading}>
                {isDownloading ? "Downloading..." : "Download ZIP"}
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Prefer the terminal?{" "}
              <span className="font-mono">npx saas-forge@latest</span>
            </p>
          </form>
        </Form>
      </div>
    </div>
  );
}
