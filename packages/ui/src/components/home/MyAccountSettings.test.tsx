import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  updateUser: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  authClient: {
    listAccounts: mocks.listAccounts,
    updateUser: mocks.updateUser,
  },
  useSession: () => ({
    pending: false,
    data: {
      user: {
        email: "guest@example.com",
        image: null,
        name: "Guest",
        role: "guest",
      },
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: vi.fn(),
  },
}));

vi.mock("@workspace/ui/components/shadcn/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) => src ? <img src={src} {...props} /> : null,
}));

import MyAccountSettings from "./MyAccountSettings";

afterEach(() => vi.clearAllMocks());

describe("MyAccountSettings", () => {
  it("renders the guest name-update error message instead of the error object", async () => {
    mocks.listAccounts.mockResolvedValue({
      data: [{ providerId: "credential" }],
    });
    mocks.updateUser.mockResolvedValue({
      error: {
        message: "This is a read-only demo account.",
        status: 403,
        statusText: "Forbidden",
      },
    });

    render(<MyAccountSettings />);

    fireEvent.change(screen.getByLabelText("Display Name"), {
      target: { value: "Updated Guest" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(mocks.updateUser).toHaveBeenCalledWith({ name: "Updated Guest" });
      expect(mocks.toastError).toHaveBeenCalledWith("Error", {
        description: "This is a read-only demo account.",
      });
    });
  });
});
