import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { getMessages } from "@workspace/i18n/messages";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

import HeroSection from "../HeroSection";

describe("HeroSection", () => {
  it("renders a Blog button that navigates to /landing/blog", () => {
    render(
      <NextIntlClientProvider locale="en" messages={getMessages("en")}>
        <HeroSection heroSection={{ tagline: "Acme", description: "Build things" }} />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Blog" }));
    expect(push).toHaveBeenCalledWith("/landing/blog");
  });
});
