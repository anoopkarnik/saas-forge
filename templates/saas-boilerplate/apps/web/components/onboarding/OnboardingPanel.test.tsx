import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { refetch } = vi.hoisted(() => ({ refetch: vi.fn() }));
vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    onboarding: {
      state: { queryOptions: () => ({}), queryKey: () => ["onboarding"] },
      answer: { mutationOptions: () => ({}) },
      setWizard: { mutationOptions: () => ({}) },
      dismiss: { mutationOptions: () => ({}) },
      complete: { mutationOptions: () => ({}) },
    },
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined, isError: true, refetch }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import { OnboardingPanel } from "./OnboardingPanel";

describe("OnboardingPanel", () => {
  it("shows a retry action when the welcome state cannot load", () => {
    render(<OnboardingPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load welcome setup");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
