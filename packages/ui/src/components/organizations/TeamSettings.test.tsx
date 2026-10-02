import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { TeamSettings } from "./TeamSettings";

const members = [
  { id: "m1", userId: "u1", name: "Owner One", email: "o@x.io", role: "owner", createdAt: new Date() },
  { id: "m2", userId: "u2", name: "Admin Two", email: "a@x.io", role: "admin", createdAt: new Date() },
  { id: "m3", userId: "u3", name: "Member Three", email: "m@x.io", role: "member", createdAt: new Date() },
];

function setup(currentRole: string, currentUserId: string) {
  window.confirm = vi.fn(() => true);
  const props = {
    organization: { id: "org1", name: "Acme" },
    currentRole,
    currentUserId,
    members,
    invitations: [{ id: "inv1", email: "new@x.io", role: "viewer", expiresAt: new Date("2030-01-01") }],
    onRename: vi.fn(),
    onInvite: vi.fn(),
    onCancelInvitation: vi.fn(),
    onChangeRole: vi.fn(),
    onRemove: vi.fn(),
    onLeave: vi.fn(),
    onDelete: vi.fn(),
  };
  render(<TeamSettings {...props} />);
  return props;
}

const row = (email: string) => screen.getByText(email).closest("li") as HTMLElement;

describe("TeamSettings", () => {
  it("hides management controls from plain members", () => {
    setup("member", "u3");
    expect(screen.queryByLabelText(/invite email/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete workspace/i })).toBeNull();
    expect(screen.getByRole("button", { name: /leave workspace/i })).toBeTruthy();
  });

  it("lets admins invite, defaulting to the member role", () => {
    const props = setup("admin", "u2");
    fireEvent.change(screen.getByLabelText(/invite email/i), { target: { value: "bo@x.io" } });
    fireEvent.click(screen.getByRole("button", { name: /send invite/i }));
    expect(props.onInvite).toHaveBeenCalledWith({ email: "bo@x.io", role: "member" });
  });

  it("does not offer roles above the admin's own", () => {
    setup("admin", "u2");
    const options = within(screen.getByLabelText(/invite role/i))
      .getAllByRole("option")
      .map((o) => o.getAttribute("value"));
    expect(options).toEqual(["admin", "member", "viewer"]);
  });

  it("does not let an admin manage an owner or themself", () => {
    setup("admin", "u2");
    expect(within(row("o@x.io")).queryByRole("button", { name: /remove/i })).toBeNull();
    expect(within(row("a@x.io")).queryByRole("button", { name: /remove/i })).toBeNull();
    fireEvent.click(within(row("m@x.io")).getByRole("button", { name: /remove/i }));
  });

  it("changes a member's role", () => {
    const props = setup("owner", "u1");
    fireEvent.change(within(row("m@x.io")).getByLabelText(/role for member three/i), {
      target: { value: "viewer" },
    });
    expect(props.onChangeRole).toHaveBeenCalledWith("m3", "viewer");
  });

  it("revokes a pending invitation", () => {
    const props = setup("owner", "u1");
    fireEvent.click(screen.getByRole("button", { name: /revoke invitation for new@x.io/i }));
    expect(props.onCancelInvitation).toHaveBeenCalledWith("inv1");
  });

  it("only owners can delete the workspace", () => {
    const props = setup("owner", "u1");
    fireEvent.click(screen.getByRole("button", { name: /delete workspace/i }));
    expect(props.onDelete).toHaveBeenCalled();
  });
});
