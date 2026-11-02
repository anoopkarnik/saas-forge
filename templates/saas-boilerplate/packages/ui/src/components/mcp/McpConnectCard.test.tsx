import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { McpConnectCard, mcpServerAlias } from "./McpConnectCard";

describe("McpConnectCard", () => {
  it("builds both client snippets from the explicit backend origin and product name", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(
      <McpConnectCard
        appName="Acme CRM"
        serverOrigin="https://backend.example.com"
      />,
    );

    expect(
      screen.getByText(
        /claude mcp add --transport http acme-crm https:\/\/backend.example.com\/api\/mcp/,
      ),
    ).toBeTruthy();
    expect(screen.getByText(/"acme-crm": \{/).textContent).toContain(
      '"url": "https://backend.example.com/api/mcp"',
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Copy" })[0]!);
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("https://backend.example.com/api/mcp"),
      ),
    );
  });

  it("uses a client-safe alias", () => {
    expect(mcpServerAlias("  Acme CRM 2.0!  ")).toBe("acme-crm-2-0");
    expect(mcpServerAlias("日本語")).toBe("app");
  });
});
