import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  useSession: () => ({ data: { user: { role: "user" } } }),
}));

import DashboardPage from "./DashboardPage";

describe("DashboardPage preset handoff", () => {
  it("keeps the applied configuration editable through every wizard step", () => {
    render(<DashboardPage onSubmitConfiguration={vi.fn()} />);

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
    expect(screen.getByText("AI Providers")).toBeTruthy();
    const openAiKey = screen.getByLabelText(
      "OpenAI API Key",
    ) as HTMLInputElement;
    fireEvent.change(openAiKey, { target: { value: "preserved-secret" } });
    expect(openAiKey.value).toBe("preserved-secret");

    fireEvent.click(screen.getByRole("button", { name: /Review Check/ }));
    expect(screen.getByText("What You're Building")).toBeTruthy();
    expect(screen.getAllByText("Launch Bot").length).toBeGreaterThan(0);
    expect(screen.getByText("AI Chatbot · Balanced Beta")).toBeTruthy();
  });
});
