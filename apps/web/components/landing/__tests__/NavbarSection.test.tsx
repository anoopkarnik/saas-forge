import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { getMessages } from "@workspace/i18n/messages";

const changeLocale = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light" }) }));
vi.mock("@/hooks/useChangeLocale", () => ({ useChangeLocale: () => changeLocale }));

import NavbarSection from "../NavbarSection";

const navbarSection = { title: "Acme", logo: "", darkLogo: "", githubLink: "", githubUsername: "", githubRepositoryName: "" } as never;

describe("NavbarSection", () => {
  it("renders Spanish links and lets a visitor switch language", () => {
    render(
      <NextIntlClientProvider locale="es" messages={getMessages("es")}>
        <NavbarSection navbarSection={navbarSection} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByText("Funciones").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Idioma"), { target: { value: "en" } });
    expect(changeLocale).toHaveBeenCalledWith("en");
  });
});
