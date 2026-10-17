import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteConfigProvider } from "@/components/site-config/SiteConfigProvider";
import type { PublicSiteConfig } from "@/lib/site-config/registry";
import { McpConnectCard, mcpServerAlias } from "./McpConnectCard";

describe("mcpServerAlias", () => {
  it("turns the product name into a client-safe server name", () => {
    expect(mcpServerAlias("SaaS Forge")).toBe("saas-forge");
    expect(mcpServerAlias("  Acme CRM 2.0!  ")).toBe("acme-crm-2-0");
    expect(mcpServerAlias("日本語")).toBe("app");
  });
});

describe("McpConnectCard", () => {
  it("names the server after the product in both snippets", () => {
    const config = { "branding.saasName": "Acme CRM" } as PublicSiteConfig;
    render(
      <SiteConfigProvider config={config}>
        <McpConnectCard />
      </SiteConfigProvider>,
    );

    expect(screen.getByText(/claude mcp add --transport http acme-crm http:\/\//)).toBeTruthy();
    expect(screen.getByText(/"acme-crm": \{/)).toBeTruthy();
  });
});
