import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useSession = vi.fn();
vi.mock("@workspace/auth/better-auth/auth-client", () => ({ useSession: () => useSession() }));

import { GuestBanner } from "./GuestBanner";

afterEach(() => vi.clearAllMocks());

describe("GuestBanner", () => {
  it("shows a read-only notice for guests", () => {
    useSession.mockReturnValue({ data: { user: { role: "guest" } } });
    render(<GuestBanner />);
    expect(screen.getByText(/read-only demo/i)).toBeTruthy();
  });

  it("renders nothing for non-guests", () => {
    useSession.mockReturnValue({ data: { user: { role: "user" } } });
    const { container } = render(<GuestBanner />);
    expect(container.firstChild).toBeNull();
  });
});
