import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  useSession: () => ({ data: { user: { role: "user" } } }),
}));

import DashboardPage from "./DashboardPage";
import type { ScaffoldCatalog } from "../../lib/constants/scaffold-modules";

const catalog: ScaffoldCatalog = {
  baseCredits: 20,
  tierUpgradeCreditsPerStep: 3,
  modules: [],
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
