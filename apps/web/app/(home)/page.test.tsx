import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@workspace/ui/blocks/dashboard/DashboardPage", () => ({ default: () => <div>Download wizard</div> }));
vi.mock("@/components/scaffold-preview/ScaffoldPreview", () => ({ ScaffoldPreview: () => null }));
vi.mock("@/trpc/client", () => ({
  useTRPC: () => ({
    scaffold: { catalog: { queryOptions: () => ({ queryKey: ["catalog"] }) } },
    project: { save: { mutationOptions: () => ({}) } },
    onboarding: {
      state: { queryOptions: () => ({ queryKey: ["onboarding"] }), queryKey: () => ["onboarding"] },
      answer: { mutationOptions: () => ({}) },
      setWizard: { mutationOptions: () => ({}) },
      dismiss: { mutationOptions: () => ({}) },
      complete: { mutationOptions: () => ({}) },
    },
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === "catalog"
    ? { data: { baseCredits: 20, modules: [] } }
    : { data: { showWizard: true, step: 0, answers: {}, checklist: null, checklistDismissed: false } },
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import Page from "./page";

describe("builder home page", () => {
  it("opens the welcome wizard for a new user", () => {
    render(<Page />);
    expect(screen.getByRole("dialog")).toHaveTextContent("What do you do?");
    expect(screen.getByText("Download wizard")).toBeTruthy();
  });
});
