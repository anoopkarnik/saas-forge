import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UserActionsDropdown } from "./UserActionsDropdown";

// The real Radix DropdownMenu only opens on pointerdown (not click) and, once
// opened, mounts react-remove-scroll which crashes under this workspace's test
// setup because of a duplicate React module instance pulled in through pnpm's
// hoisted node_modules layout. Stub the primitives so this test can exercise
// UserActionsDropdown's own rendering/behavior without depending on Radix's
// internal open mechanics or that unrelated environment issue.
vi.mock("@workspace/ui/components/shadcn/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

function setup(role: string) {
  const onSetRole = vi.fn();
  render(
    <UserActionsDropdown
      user={{ id: "u2", role, banned: false }}
      currentUserId="admin1"
      onSetRole={onSetRole}
      onBanToggle={vi.fn()}
      onRemove={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
  return { onSetRole };
}

describe("UserActionsDropdown guest option", () => {
  it("offers Set as Guest for a non-guest user", () => {
    const { onSetRole } = setup("user");
    fireEvent.click(screen.getByText(/set as guest/i));
    expect(onSetRole).toHaveBeenCalledWith("u2", "guest");
  });
});
