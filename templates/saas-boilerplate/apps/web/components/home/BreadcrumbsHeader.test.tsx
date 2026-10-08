import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ pathname: "/admin/settings" }));
vi.mock("next/navigation", () => ({ usePathname: () => state.pathname, useRouter: () => ({ push: vi.fn() }) }));
import { BreadcrumbsHeader } from "./BreadcrumbsHeader";
describe("BreadcrumbsHeader", () => {
  it("provides a named home link and does not link to the absent admin index", () => {
    render(<BreadcrumbsHeader />);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    expect(screen.getByText("Settings").getAttribute("aria-current")).toBe("page");
    expect(screen.queryByRole("button", { name: "" })).toBeNull();
  });
});
