import { describe, expect, it } from "vitest";
import { fillEnvTemplate, nativeEnvValues } from "@/lib/env-files";

describe("fillEnvTemplate", () => {
  it("fills known keys and keeps comments and order", () => {
    const template = "# App\nNEXT_PUBLIC_URL=\n\n# Theme\nNEXT_PUBLIC_THEME=green\n";
    expect(fillEnvTemplate(template, { NEXT_PUBLIC_URL: "https://app.example.com", OTHER: "x" })).toBe(
      "# App\nNEXT_PUBLIC_URL=https://app.example.com\n\n# Theme\nNEXT_PUBLIC_THEME=green\n",
    );
  });

  it("lists the values when there is no template", () => {
    expect(fillEnvTemplate(undefined, { A: "1", B: "2" })).toBe("A=1\nB=2");
  });
});

describe("nativeEnvValues", () => {
  it("mirrors the web URL, auth providers and support features", () => {
    const { mobile, desktop } = nativeEnvValues(
      {
        NEXT_PUBLIC_URL: "https://app.example.com",
        NEXT_PUBLIC_AUTH_GOOGLE: "true",
        NEXT_PUBLIC_SUPPORT_FEATURES: "support_mail",
        NEXT_PUBLIC_SUPPORT_MAIL: "hi@example.com",
        NEXT_PUBLIC_CALENDLY_BOOKING_URL: "https://calendly.com/x",
      },
      [],
    );
    expect(mobile.EXPO_PUBLIC_API_URL).toBe("https://app.example.com");
    expect(mobile.EXPO_PUBLIC_AUTH_GOOGLE).toBe("true");
    expect(mobile.EXPO_PUBLIC_AUTH_GITHUB).toBe("false");
    expect(mobile.EXPO_PUBLIC_SUPPORT_MAIL).toBe("true");
    expect(desktop.VITE_API_URL).toBe('"https://app.example.com"');
    expect(desktop.VITE_SUPPORT_MAIL).toBe('"hi@example.com"');
    // Calendly was not among the support features.
    expect(desktop.VITE_CALENDLY_BOOKING_URL).toBe('""');
  });

  // scaffold:begin billing
  it("only passes the payment gateway on when billing is in the project", () => {
    const web = { NEXT_PUBLIC_PAYMENT_GATEWAY: "stripe" };
    expect(nativeEnvValues(web, []).mobile.EXPO_PUBLIC_PAYMENT_GATEWAY).toBe("none");
    expect(nativeEnvValues(web, ["billing"]).desktop.VITE_PAYMENT_GATEWAY).toBe('"stripe"');
  });
  // scaffold:end billing
});
