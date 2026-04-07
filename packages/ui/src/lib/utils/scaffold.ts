import { formSchema, FormValues } from "../zod/download";
import { type ScaffoldModuleId } from "../constants/scaffold-modules";

const PAYMENT_ENV_FIELDS = new Set([
    "NEXT_PUBLIC_PAYMENT_GATEWAY",
    "DODO_PAYMENTS_API_KEY",
    "DODO_PAYMENTS_WEBHOOK_KEY",
    "DODO_PAYMENTS_RETURN_URL",
    "DODO_PAYMENTS_ENVIRONMENT",
    "DODO_CREDITS_PRODUCT_ID",
    "NEXT_PUBLIC_DODO_PAYMENTS_URL",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
]);

const TEMPLATE_REPO_URL = "https://github.com/anoopkarnik/saas-forge";

/**
 * Parses an uploaded .env file and extracts the keys that match the scaffold form.
 */
export function parseEnvFile(content: string, setValue: any) {
    const lines = content.split("\n");
    let count = 0;
    const parsedEnv: Record<string, string> = {};

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
            parsedEnv[key] = value;
        }
    });

    Object.keys(parsedEnv).forEach((key) => {
        if (key in formSchema.shape && key !== "NEXT_PUBLIC_AUTH_PROVIDERS") {
            setValue(key as keyof FormValues, parsedEnv[key], {
                shouldDirty: true,
                shouldValidate: true,
            });
            count++;
        }
    });

    const providers: ("email_verification" | "linkedin" | "google" | "github")[] = [];
    if (parsedEnv["NEXT_PUBLIC_AUTH_EMAIL"] === "true") providers.push("email_verification");
    if (parsedEnv["NEXT_PUBLIC_AUTH_GOOGLE"] === "true") providers.push("google");
    if (parsedEnv["NEXT_PUBLIC_AUTH_GITHUB"] === "true") providers.push("github");
    if (parsedEnv["NEXT_PUBLIC_AUTH_LINKEDIN"] === "true") providers.push("linkedin");

    if (providers.length > 0) {
        setValue("NEXT_PUBLIC_AUTH_PROVIDERS", providers, {
            shouldDirty: true,
            shouldValidate: true,
        });
        count += providers.length;
    }

    if (parsedEnv["NEXT_PUBLIC_OBSERVABILITY_FEATURES"]) {
        const obsFeatures = parsedEnv["NEXT_PUBLIC_OBSERVABILITY_FEATURES"].split(",").map(f => f.trim()) as ("logging" | "google_analytics" | "rate_limiting")[];
        if (obsFeatures.length > 0) {
            setValue("NEXT_PUBLIC_OBSERVABILITY_FEATURES", obsFeatures, {
                shouldDirty: true,
                shouldValidate: true,
            });
            count++;
        }
    }

    if (parsedEnv["NEXT_PUBLIC_SUPPORT_FEATURES"]) {
        const supportFeatures = parsedEnv["NEXT_PUBLIC_SUPPORT_FEATURES"].split(",").map(f => f.trim()) as ("support_mail" | "calendly")[];
        if (supportFeatures.length > 0) {
            setValue("NEXT_PUBLIC_SUPPORT_FEATURES", supportFeatures, {
                shouldDirty: true,
                shouldValidate: true,
            });
            count++;
        }
    }

    const selectedModules = new Set<ScaffoldModuleId>();
    if (
        parsedEnv["NEXT_PUBLIC_PAYMENT_GATEWAY"] &&
        parsedEnv["NEXT_PUBLIC_PAYMENT_GATEWAY"] !== "none"
    ) {
        selectedModules.add("billing");
    }

    setValue("SELECTED_MODULES", Array.from(selectedModules), {
        shouldDirty: true,
        shouldValidate: true,
    });

    return count;
}

/**
 * Builds the array of configured environment variables from FormValues.
 */
export function buildEnvVarsFromForm(values: FormValues): Record<string, string> {
    const envVars: Record<string, string> = {};
    const envKeys = Object.keys(values).filter((k) => k !== "name") as (keyof FormValues)[];
    const selectedModules = new Set(values.SELECTED_MODULES || []);

    for (const key of envKeys) {
        if (key === "NEXT_PUBLIC_AUTH_PROVIDERS" || key === "SELECTED_MODULES") continue;
        if (!selectedModules.has("billing") && PAYMENT_ENV_FIELDS.has(key as string)) continue;

        const value = values[key];
        if (Array.isArray(value) && value.length > 0) {
            envVars[key] = value.join(",");
        } else if (value && typeof value === "string" && value.trim()) {
            envVars[key] = value;
        }
    }

    const selectedProviders = values.NEXT_PUBLIC_AUTH_PROVIDERS || [];
    envVars["NEXT_PUBLIC_AUTH_EMAIL"] = selectedProviders.includes("email_verification") ? "true" : "false";
    envVars["NEXT_PUBLIC_AUTH_GOOGLE"] = selectedProviders.includes("google") ? "true" : "false";
    envVars["NEXT_PUBLIC_AUTH_GITHUB"] = selectedProviders.includes("github") ? "true" : "false";
    envVars["NEXT_PUBLIC_AUTH_LINKEDIN"] = selectedProviders.includes("linkedin") ? "true" : "false";

    return envVars;
}

/**
 * Constructs the Vercel deploy URL with environment variable mappings.
 */
export function buildVercelDeployUrl(values: FormValues): string {
    const envVars = buildEnvVarsFromForm(values);
    const allKeys = Object.keys(envVars);
    
    // Group defaults (all safe NEXT_PUBLIC vars)
    const defaults: Record<string, string> = {};
    for (const key of allKeys) {
        if (key.startsWith("NEXT_PUBLIC_")) {
            defaults[key] = envVars[key]!;
        }
    }

    const params = new URLSearchParams();
    params.set("repository-url", TEMPLATE_REPO_URL);
    params.set("framework", "nextjs");
    params.set("build-command", "pnpm -w run generate && pnpm build");
    params.set("root-directory", "templates/saas-boilerplate/apps/web");
    
    if (values.name) params.set("project-name", values.name);
    if (allKeys.length > 0) params.set("env", allKeys.join(","));
    if (Object.keys(defaults).length > 0) {
        params.set("envDefaults", JSON.stringify(defaults));
    }
    params.set("envDescription", "Configure your SaaS boilerplate environment variables. Public/non-sensitive values are pre-filled.");

    return `https://vercel.com/new/clone?${params.toString()}`;
}
