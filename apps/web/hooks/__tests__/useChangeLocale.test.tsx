import React from "react";
import { act, renderHook } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMessages } from "@workspace/i18n/messages";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  updateUser: vi.fn(),
  toastError: vi.fn(),
  session: { data: { user: { id: "u1", role: "user" } } } as unknown,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  authClient: { updateUser: mocks.updateUser },
  useSession: () => mocks.session,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

import { useChangeLocale } from "../useChangeLocale";

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NextIntlClientProvider locale="en" messages={getMessages("en")}>{children}</NextIntlClientProvider>
);

beforeEach(() => {
  vi.clearAllMocks();
  document.cookie = "NEXT_LOCALE=; max-age=0; path=/";
  mocks.session = { data: { user: { id: "u1", role: "user" } } };
});

describe("useChangeLocale", () => {
  it("saves the choice on the user and in the cookie, then refreshes", async () => {
    mocks.updateUser.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useChangeLocale(), { wrapper });
    await act(() => result.current("es"));
    expect(document.cookie).toContain("NEXT_LOCALE=es");
    expect(mocks.updateUser).toHaveBeenCalledWith({ locale: "es" });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("explains a failed save instead of silently doing nothing", async () => {
    mocks.updateUser.mockResolvedValue({ error: { message: "nope" } });
    const { result } = renderHook(() => useChangeLocale(), { wrapper });
    await act(() => result.current("es"));
    expect(mocks.toastError).toHaveBeenCalledWith("Could not save your language. Please try again.");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("only sets the cookie for visitors and the read-only guest", async () => {
    mocks.session = { data: { user: { id: "g", role: "guest" } } };
    const { result } = renderHook(() => useChangeLocale(), { wrapper });
    await act(() => result.current("es"));
    expect(mocks.updateUser).not.toHaveBeenCalled();
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
