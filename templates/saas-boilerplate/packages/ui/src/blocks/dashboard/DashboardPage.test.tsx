import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  useSession: () => ({ data: { user: { role: "user" } } }),
}));

import DashboardPage from "./DashboardPage";
import type { ScaffoldCatalog, ScaffoldModuleId } from "../../lib/constants/scaffold-modules";

const catalog: ScaffoldCatalog = {
  baseCredits: 20,
  tierUpgradeCreditsPerStep: 3,
  modules: [],
};

const moduleLabels: Record<ScaffoldModuleId, string> = {
  billing: "Billing & Payments",
  multi_tenancy: "Organizations / Teams",
  ai: "AI Platform",
  ai_agents: "AI Agents & RAG (Python)",
  api_keys: "API Keys",
  jobs: "Background jobs & cron",
  notifications: "Notifications",
  audit_log: "Audit log",
  webhooks: "Outgoing webhooks",
  feature_flags: "Feature flags",
  onboarding: "Onboarding",
};

describe("DashboardPage preset availability", () => {
  it("shows presets as coming soon without opening the preset journey", () => {
    render(<DashboardPage catalog={catalog} onSubmitConfiguration={vi.fn()} />);

    const preset = screen.getByRole("button", { name: /^Use a Preset/ });
    expect(preset).toBeDisabled();
    expect(within(preset).getByText(/Coming soon/)).toBeTruthy();
    fireEvent.click(preset);
    expect(screen.queryByRole("region", { name: "Choose how you want to ship" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^Set Up Manually/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Basics/ }));
    expect(screen.getByText("Core Identity")).toBeTruthy();
  });

  it("does not expose the preset journey in advanced setup", () => {
    render(<DashboardPage catalog={catalog} onSubmitConfiguration={vi.fn()} />);

    fireEvent.click(screen.getByRole("switch", { name: "Toggle advanced scaffold setup" }));
    expect(screen.getByRole("heading", { name: "Advanced Setup" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Choose how you want to ship" })).toBeNull();
  });
});

describe("DashboardPage manual features", () => {
  it("offers every available paid module and includes required modules in the price", () => {
    const ids: ScaffoldModuleId[] = [
      "billing", "multi_tenancy", "ai", "ai_agents", "api_keys", "jobs",
      "notifications", "audit_log", "webhooks", "feature_flags", "onboarding",
    ];
    const fullCatalog: ScaffoldCatalog = {
      ...catalog,
      modules: ids.map((id) => ({
        id,
        label: moduleLabels[id],
        description: `${id} description`,
        creditsCost: id === "jobs" ? 15 : 10,
        available: true,
        requires: id === "webhooks" ? ["jobs"] : [],
        incompatibleWith: [],
      })),
    };

    render(<DashboardPage catalog={fullCatalog} onSubmitConfiguration={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /^Features/ }));
    expect(screen.getByText("Optional Features")).toBeTruthy();

    for (const id of ids) {
      expect(screen.getByRole("button", { name: (name) => name.startsWith(moduleLabels[id]) })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole("button", { name: /^Outgoing webhooks/ }));
    expect(within(screen.getByRole("button", { name: /^Outgoing webhooks/ })).getByText("Included")).toBeTruthy();
    expect(within(screen.getByRole("button", { name: /^Background jobs & cron/ })).getByText("Included")).toBeTruthy();
    expect(screen.getByText("20 base credits + 15 for Background jobs & cron, 10 for Outgoing webhooks")).toBeTruthy();
  });
});

describe("DashboardPage advanced setup", () => {
  it("shows configuration choices without credential or contact-value inputs", async () => {
    render(<DashboardPage catalog={catalog} onSubmitConfiguration={vi.fn()} />);
    fireEvent.click(screen.getByRole("switch", { name: "Toggle advanced scaffold setup" }));

    expect(screen.getByLabelText("Project Name (Folder Name)")).toBeTruthy();
    expect(screen.getByText("NEXT_PUBLIC_CMS")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Import .env" })).toBeNull();
    expect(screen.queryByLabelText(/DATABASE_URL/)).toBeNull();
    expect(screen.queryByLabelText(/BETTER_AUTH_SECRET/)).toBeNull();
    expect(screen.queryByLabelText(/BLOB_READ_WRITE_TOKEN/)).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send Support Mail" }));
    });
    expect(screen.queryByLabelText(/NEXT_PUBLIC_SUPPORT_MAIL/)).toBeNull();
    expect(screen.getByText("NEXT_PUBLIC_EMAIL_CLIENT")).toBeTruthy();
  });

  it("does not send imported credentials when saving a configuration", async () => {
    const onSaveConfiguration = vi.fn();
    render(
      <DashboardPage
        catalog={catalog}
        onSubmitConfiguration={vi.fn()}
        onSaveConfiguration={onSaveConfiguration}
      />,
    );

    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    fireEvent.change(fileInput, {
      target: { files: [new File(["DATABASE_URL=postgresql://canary\nNEXT_PUBLIC_CMS=constant\n"], "config.env")] },
    });
    await waitFor(() => expect(screen.getByText(/Imported 2 fields/)).toBeTruthy());

    fireEvent.click(screen.getByRole("switch", { name: "Toggle advanced scaffold setup" }));
    fireEvent.change(screen.getByLabelText("Project Name (Folder Name)"), {
      target: { value: "demo" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save configuration/ }));

    await waitFor(() => expect(onSaveConfiguration).toHaveBeenCalledOnce());
    expect(onSaveConfiguration.mock.calls[0]?.[0].config).not.toHaveProperty("DATABASE_URL");
  });
});
