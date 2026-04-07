import { FormState, DEFAULT_FORM } from "./constants";

export function parseMobileEnvFile(content: string, currentValues: FormState): { newValues: FormState, count: number } {
    const lines = content.split("\n");
    let count = 0;
    const parsedEnv: Record<string, string> = {};

    lines.forEach((line: string) => {
        if (line.startsWith("#") || !line.trim()) return;
        const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (match) {
            const key = match[1];
            const rawValue = match[2];
            if (!key || rawValue === undefined) return;
            let value = rawValue.trim();
            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))
            ) {
                value = value.slice(1, -1);
            }
            parsedEnv[key] = value;
        }
    });

    const newValues = { ...currentValues };

    // Set string fields
    Object.keys(parsedEnv).forEach((key) => {
        if (
            key in DEFAULT_FORM &&
            !Array.isArray(DEFAULT_FORM[key as keyof FormState]) &&
            key !== "name" &&
            key !== "NEXT_PUBLIC_AUTH_PROVIDERS" &&
            key !== "NEXT_PUBLIC_OBSERVABILITY_FEATURES" &&
            key !== "NEXT_PUBLIC_SUPPORT_FEATURES" &&
            key !== "NEXT_PUBLIC_PLATFORM"
        ) {
            (newValues as any)[key] = parsedEnv[key];
            count++;
        }
    });

    // Auth providers from boolean flags
    const providers: string[] = [];
    if (parsedEnv["NEXT_PUBLIC_AUTH_EMAIL"] === "true") providers.push("email_verification");
    if (parsedEnv["NEXT_PUBLIC_AUTH_GOOGLE"] === "true") providers.push("google");
    if (parsedEnv["NEXT_PUBLIC_AUTH_GITHUB"] === "true") providers.push("github");
    if (parsedEnv["NEXT_PUBLIC_AUTH_LINKEDIN"] === "true") providers.push("linkedin");
    if (providers.length > 0) {
        newValues.NEXT_PUBLIC_AUTH_PROVIDERS = providers;
        count += providers.length;
    }

    // Comma-separated array fields
    if (parsedEnv["NEXT_PUBLIC_OBSERVABILITY_FEATURES"]) {
        newValues.NEXT_PUBLIC_OBSERVABILITY_FEATURES = parsedEnv["NEXT_PUBLIC_OBSERVABILITY_FEATURES"]
            .split(",").map((f) => f.trim()).filter(Boolean);
        count++;
    }
    if (parsedEnv["NEXT_PUBLIC_SUPPORT_FEATURES"]) {
        newValues.NEXT_PUBLIC_SUPPORT_FEATURES = parsedEnv["NEXT_PUBLIC_SUPPORT_FEATURES"]
            .split(",").map((f) => f.trim()).filter(Boolean);
        count++;
    }
    if (parsedEnv["NEXT_PUBLIC_PLATFORM"]) {
        newValues.NEXT_PUBLIC_PLATFORM = parsedEnv["NEXT_PUBLIC_PLATFORM"]
            .split(",").map((f) => f.trim()).filter(Boolean);
        count++;
    }

    newValues.SELECTED_MODULES =
        parsedEnv["NEXT_PUBLIC_PAYMENT_GATEWAY"] &&
        parsedEnv["NEXT_PUBLIC_PAYMENT_GATEWAY"] !== "none"
            ? ["billing"]
            : [];

    return { newValues, count };
}
