import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ pathname: "/admin/settings" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname, useRouter: () => ({ push: vi.fn() }) }));
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "@workspace/i18n/messages";
import { BreadcrumbsHeader } from "./BreadcrumbsHeader";
describe("BreadcrumbsHeader", () => {
  it("provides a named home link and does not link to the absent admin index", () => {
    render(<NextIntlClientProvider locale="en" messages={getMessages("en")}><BreadcrumbsHeader /></NextIntlClientProvider>);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    expect(screen.getByText("Settings").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("button", { name: "" })).toBeNull();
  });
});
