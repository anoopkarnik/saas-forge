import * as React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  type ProductTypeId,
  type ResolvedPreset,
  type StageEstimate,
  type TierId,
  type VersionId,
} from "@workspace/ui/lib/constants/presets";
import { PresetJourney } from "./PresetJourney";

function JourneyHarness({
  appliedPresetId,
  onApply = () => undefined,
}: {
  appliedPresetId?: string;
  onApply?: (preset: ResolvedPreset) => void;
}) {
  const [productTypeId, setProductTypeId] =
    React.useState<ProductTypeId | null>(null);
  const [tierId, setTierId] = React.useState<TierId>("tier-2");
  const [versionId, setVersionId] = React.useState<VersionId>("balanced");
  const [stage, setStage] = React.useState<StageEstimate>({ kind: "beta" });

  return (
    <PresetJourney
      productTypeId={productTypeId}
      tierId={tierId}
      versionId={versionId}
      stage={stage}
      appliedPresetId={appliedPresetId}
      onProductTypeChange={setProductTypeId}
      onTierChange={setTierId}
      onVersionChange={setVersionId}
      onStageChange={setStage}
      onApply={onApply}
      onBack={vi.fn()}
    />
  );
}

describe("PresetJourney", () => {
  it("searches product types and opens the recommended balanced version", () => {
    render(<JourneyHarness />);

    fireEvent.change(screen.getByLabelText("Search product types"), {
      target: { value: "chatbot" },
    });
    fireEvent.click(screen.getByRole("button", { name: /AI Chatbot/i }));

    expect(
      screen.getByRole<HTMLButtonElement>("button", { name: /Lean Beta/i })
        .disabled,
    ).toBe(false);
    expect(
      screen
        .getAllByRole("button", { name: /Balanced Beta/i })
        .find((button) => button.hasAttribute("aria-pressed"))
        ?.getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: /Use Balanced Beta/i,
      }).disabled,
    ).toBe(false);
    expect(
      screen.getByText("Balanced Beta architecture blueprint"),
    ).toBeTruthy();
  });

  it("keeps every tier selectable and updates the MAU recommendation", () => {
    render(<JourneyHarness />);

    const enterprise = screen.getByRole("button", {
      name: /Tier 6 · Enterprise/i,
    });
    expect((enterprise as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(enterprise);
    expect(enterprise.getAttribute("aria-pressed")).toBe("true");

    fireEvent.change(
      screen.getByRole("combobox", { name: "Current product stage" }),
      {
        target: { value: "mau" },
      },
    );
    fireEvent.change(screen.getByLabelText("Expected monthly active users"), {
      target: { value: "50000" },
    });

    const scaleTier = screen.getByRole("button", { name: /Tier 5 · Scale/i });
    expect(scaleTier.getAttribute("aria-pressed")).toBe("true");
    expect(within(scaleTier).getByText("Recommended")).toBeTruthy();
  });

  it("applies a selected preset and confirms replacement of an existing one", () => {
    const onApply = vi.fn<(preset: ResolvedPreset) => void>();
    const { rerender } = render(<JourneyHarness onApply={onApply} />);

    fireEvent.click(screen.getByRole("button", { name: /AI Chatbot/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use Balanced Beta/i }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ai-chatbot:tier-2:balanced" }),
    );

    onApply.mockClear();
    rerender(
      <JourneyHarness
        appliedPresetId="crm-sales:tier-1:lean"
        onApply={onApply}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /AI Chatbot/i }));
    fireEvent.click(screen.getByRole("button", { name: /Use Balanced Beta/i }));

    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Replace preset" }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ai-chatbot:tier-2:balanced" }),
    );
  });
});
