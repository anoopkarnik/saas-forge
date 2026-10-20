import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "../../test/intl";

const useSession = vi.fn();
vi.mock("@workspace/auth/better-auth/auth-client", () => ({ useSession: () => useSession() }));

import { GuestBanner } from "./GuestBanner";

afterEach(() => vi.clearAllMocks());

describe("GuestBanner", () => {
  it("shows a read-only notice for guests", () => {
    useSession.mockReturnValue({ data: { user: { role: "guest" } } });
    renderWithIntl(<GuestBanner />);
    expect(screen.getByText(/read-only demo/i)).toBeTruthy();
  });

  it("renders nothing for non-guests", () => {
    useSession.mockReturnValue({ data: { user: { role: "user" } } });
    const { container } = renderWithIntl(<GuestBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the notice in Spanish", () => {
    useSession.mockReturnValue({ data: { user: { role: "guest" } } });
    renderWithIntl(<GuestBanner />, { locale: "es" });
    expect(screen.getByText(/demo de solo lectura/)).toBeTruthy();
  });
});
