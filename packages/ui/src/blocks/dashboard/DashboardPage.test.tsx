import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  useSession: () => ({ data: { user: { role: "user" } } }),
}));

import DashboardPage from "./DashboardPage";
import type { ScaffoldCatalog } from "../../lib/constants/scaffold-modules";

const module = (id: ScaffoldCatalog["modules"][number]["id"], label: string, creditsCost: number, available = true) => ({
  id,
  label,
  description: `${label} description`,
  creditsCost,
  available,
  requires: [],
  incompatibleWith: [],
});

const catalog: ScaffoldCatalog = {
  baseCredits: 20,
  tierUpgradeCreditsPerStep: 3,
  modules: [
    module("billing", "Billing & Payments", 10),
    module("multi_tenancy", "Organizations / Teams", 50),
    module("ai", "AI Platform", 20),
    module("api_keys", "API Keys", 0, false),
  ],
};

describe("DashboardPage preset handoff", () => {
  it("keeps the applied configuration editable through every wizard step", () => {
    render(<DashboardPage catalog={catalog} onSubmitConfiguration={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^Use a Preset/ }));

    const journey = screen.getByRole("region", {
      name: "Choose how you want to ship",
    });
    fireEvent.change(within(journey).getByLabelText("Search product types"), {
      target: { value: "AI Chatbot" },
    });
    fireEvent.click(
      within(journey).getByRole("button", { name: /AI Chatbot/ }),
    );
    fireEvent.click(
      within(journey).getByRole("button", { name: "Use Balanced Beta" }),
    );

    expect(screen.getByText("Core Identity")).toBeTruthy();
    const productName = screen.getByLabelText(
      /Product Name/,
    ) as HTMLInputElement;
    fireEvent.change(productName, { target: { value: "Launch Bot" } });
    expect(productName.value).toBe("Launch Bot");

    fireEvent.click(
      screen.getByRole("button", { name: /Features Pick the capabilities/ }),
    );
    const aiModule = screen.getByRole("button", { name: /AI Platform/ });
    expect(within(aiModule).getByText("Included")).toBeTruthy();
    fireEvent.click(aiModule);
    expect(within(aiModule).getByText("+20 credits")).toBeTruthy();
    fireEvent.click(aiModule);

    fireEvent.click(
      screen.getByRole("button", { name: /Accounts & Keys Connect/ }),
    );
    // Secrets are no longer collected in the wizard — provider key inputs now
    // live in the Projects tab. The group heading still shows the AI toggle.
    expect(screen.getByText("AI Providers")).toBeTruthy();
    expect(screen.queryByLabelText("OpenAI API Key")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Review Check/ }));
    expect(screen.getByText("What You're Building")).toBeTruthy();
    expect(screen.getAllByText("Launch Bot").length).toBeGreaterThan(0);
    expect(screen.getByText("AI Chatbot · Balanced Beta")).toBeTruthy();
  });

  it("offers Organizations / Teams beside AI Capabilities for 50 credits", () => {
    render(<DashboardPage catalog={catalog} onSubmitConfiguration={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /^Use a Preset/ }));
    const journey = screen.getByRole("region", {
      name: "Choose how you want to ship",
    });
    fireEvent.change(within(journey).getByLabelText("Search product types"), {
      target: { value: "AI Chatbot" },
    });
    fireEvent.click(within(journey).getByRole("button", { name: /AI Chatbot/ }));
    fireEvent.click(
      within(journey).getByRole("button", { name: "Use Balanced Beta" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Features Pick the capabilities/ }),
    );

    const aiPanel = screen.getByText("AI Capabilities");
    const teamsPanel = screen.getByText("Teams & Organizations");
    // The teams panel sits right after the AI panel.
    expect(
      aiPanel.compareDocumentPosition(teamsPanel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const orgModule = screen.getByRole("button", {
      name: /Organizations \/ Teams/,
    });
    expect(within(orgModule).getByText("+50 credits")).toBeTruthy();
    fireEvent.click(orgModule);
    expect(within(orgModule).getByText("Included")).toBeTruthy();
  });
});
