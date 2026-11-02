import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateKeyDialog } from "./CreateKeyDialog";

describe("CreateKeyDialog", () => {
  it("submits trimmed input and reveals the returned key after creation succeeds", async () => {
    const onCreate = vi.fn().mockResolvedValue("sk_one-time");
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CreateKeyDialog
        open
        onOpenChange={onOpenChange}
        onCreated={onCreated}
        availableScopes={["read:me", "read:credits"]}
        isPending={false}
        onCreate={onCreate}
      />,
    );
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "  CI runner  " },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "read:credits" }));
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith("sk_one-time"));
    expect(onCreate).toHaveBeenCalledWith({
      label: "CI runner",
      scopes: ["read:me", "read:credits"],
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog input and reports a failed creation without revealing a key", async () => {
    const onCreated = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <CreateKeyDialog
        open
        onOpenChange={onOpenChange}
        onCreated={onCreated}
        availableScopes={["read:me"]}
        isPending={false}
        onCreate={vi.fn().mockRejectedValue(new Error("Permission denied"))}
      />,
    );
    fireEvent.change(screen.getByLabelText("Label"), {
      target: { value: "CI runner" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create key" }));
    await screen.findByText("Permission denied");
    expect(screen.getByLabelText("Label")).toHaveValue("CI runner");
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
