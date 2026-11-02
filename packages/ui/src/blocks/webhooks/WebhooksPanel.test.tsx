import React, { useState } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WebhooksPanel, type CreateWebhookInput } from "./WebhooksPanel";

function props() {
  return {
    scope: "personal" as const,
    onScopeChange: vi.fn(),
    endpoints: [
      {
        id: "ep_1",
        url: "https://receiver.example.com",
        enabled: true,
        secretPrefix: "whsec_1",
        description: "",
        disabledReason: null,
        events: ["test.event"],
      },
    ],
    eventTypes: [{ type: "test.event", description: "Test event" }],
    readOnly: false,
    isCreating: false,
    onCreate: vi.fn(async (_input: CreateWebhookInput, onCreated: () => void) =>
      onCreated(),
    ),
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onRotateSecret: vi.fn(),
    onSendTest: vi.fn(),
    renderDeliveries: vi.fn(() => <p>Delivery details</p>),
    secret: null,
    onSecretClose: vi.fn(),
  };
}

describe("WebhooksPanel", () => {
  it("passes endpoint actions and expands deliveries through callbacks", () => {
    const callbacks = props();
    render(<WebhooksPanel {...callbacks} />);
    fireEvent.click(screen.getByRole("switch", { name: "Enabled" }));
    fireEvent.click(screen.getByRole("button", { name: "Send test event" }));
    fireEvent.click(screen.getByRole("button", { name: "Rotate secret" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Deliveries" }));
    expect(callbacks.onToggle).toHaveBeenCalledWith("ep_1", false);
    expect(callbacks.onSendTest).toHaveBeenCalledWith("ep_1");
    expect(callbacks.onRotateSecret).toHaveBeenCalledWith("ep_1");
    expect(callbacks.onDelete).toHaveBeenCalledWith("ep_1");
    expect(callbacks.renderDeliveries).toHaveBeenCalledWith("ep_1");
    expect(screen.getByText("Delivery details")).toBeTruthy();
  });

  it("submits selected events and clears a successful form", async () => {
    const callbacks = props();
    render(<WebhooksPanel {...callbacks} />);
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://new.example.com" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Orders" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "test.event Test event" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
    expect(callbacks.onCreate).toHaveBeenCalledWith(
      {
        url: "https://new.example.com",
        description: "Orders",
        events: ["test.event"],
      },
      expect.any(Function),
    );
    await waitFor(() => expect(screen.getByLabelText("URL")).toHaveValue(""));
  });

  it("resets on mutation success and preserves the next input during a slow list refresh", async () => {
    let finishRefresh!: () => void;
    const refresh = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    function Host() {
      const [secret, setSecret] = useState<string | null>(null);
      return (
        <WebhooksPanel
          {...props()}
          secret={secret}
          onSecretClose={() => setSecret(null)}
          onCreate={async (_input, onCreated) => {
            onCreated();
            setSecret("whsec_once");
            await refresh;
          }}
        />
      );
    }
    render(<Host />);
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://first.example.com" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "test.event Test event" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add endpoint" }));
    await screen.findByRole("dialog");
    expect(screen.getByLabelText("URL")).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    fireEvent.change(screen.getByLabelText("URL"), {
      target: { value: "https://next.example.com" },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "test.event Test event" }),
    );
    expect(screen.getByRole("button", { name: "Adding…" })).toBeDisabled();
    await act(async () => finishRefresh());
    expect(screen.getByLabelText("URL")).toHaveValue(
      "https://next.example.com",
    );
    expect(
      screen.getByRole("checkbox", { name: "test.event Test event" }),
    ).toBeChecked();
    expect(screen.getByRole("button", { name: "Add endpoint" })).toBeEnabled();
  });

  it("disables endpoint mutations and hides creation for read-only users", () => {
    render(<WebhooksPanel {...props()} readOnly />);
    for (const name of ["Send test event", "Rotate secret", "Delete"]) {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    }
    expect(screen.getByRole("switch", { name: "Enabled" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Add endpoint" })).toBeNull();
    expect(screen.getByRole("button", { name: "Deliveries" })).toBeEnabled();
  });
});
