import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

// Radix menus/dialogs only open on pointer events and mount react-remove-scroll,
// which breaks under this workspace's test setup (see UserActionsDropdown.test).
// Stub the primitives to exercise WorkspaceSwitcher's own behavior.
vi.mock("@workspace/ui/components/shadcn/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, onSelect, disabled }: any) => (
    <button onClick={(e) => { onClick?.(e); onSelect?.(e); }} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));
vi.mock("@workspace/ui/components/shadcn/dialog", () => ({
  Dialog: ({ open, children }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

const orgs = [
  { id: "org1", name: "Alex's Workspace", slug: "a", role: "owner" },
  { id: "org2", name: "Acme Team", slug: "b", role: "viewer" },
];

function setup(overrides: Partial<React.ComponentProps<typeof WorkspaceSwitcher>> = {}) {
  const props = {
    organizations: orgs,
    activeId: "org1",
    invitations: [],
    onSwitch: vi.fn(),
    onCreate: vi.fn(),
    onManage: vi.fn(),
    onAcceptInvitation: vi.fn(),
    onDeclineInvitation: vi.fn(),
    ...overrides,
  };
  render(<WorkspaceSwitcher {...props} />);
  return props;
}

describe("WorkspaceSwitcher", () => {
  it("shows the active workspace on the trigger", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /switch workspace/i }).textContent,
    ).toContain("Alex's Workspace");
  });

  it("switches to another workspace", () => {
    const props = setup();
    fireEvent.click(screen.getByText("Acme Team"));
    expect(props.onSwitch).toHaveBeenCalledWith("org2");
  });

  it("does not re-switch to the already active workspace", () => {
    const props = setup();
    fireEvent.click(screen.getAllByText("Alex's Workspace")[1]!);
    expect(props.onSwitch).not.toHaveBeenCalled();
  });

  it("offers accept and decline for pending invitations", () => {
    const props = setup({
      invitations: [
        { id: "inv1", organizationName: "Beta Org", inviterName: "Sam", role: "member", expiresAt: new Date("2030-01-01") },
      ],
    });
    expect(screen.getByText("Beta Org")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /accept invitation to beta org/i }));
    expect(props.onAcceptInvitation).toHaveBeenCalledWith("inv1");
    fireEvent.click(screen.getByRole("button", { name: /decline invitation to beta org/i }));
    expect(props.onDeclineInvitation).toHaveBeenCalledWith("inv1");
  });

  it("creates a workspace from the dialog with the typed name", async () => {
    const props = setup();
    fireEvent.click(screen.getByText(/create workspace/i));
    fireEvent.change(screen.getByLabelText(/workspace name/i), { target: { value: "  New Team " } });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith("New Team"));
  });

  it("opens team management", () => {
    const props = setup();
    fireEvent.click(screen.getByText(/manage team/i));
    expect(props.onManage).toHaveBeenCalled();
  });
});
