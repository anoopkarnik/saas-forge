import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import { getMessages } from "@workspace/i18n/messages";
import type { FeatureDetails } from "@workspace/ui/lib/feature-content";
import type { FeatureProps, FeatureSectionProps } from "@/lib/ts-types/landing";
import FeatureSection from "../FeatureSection";

afterEach(cleanup);

function feature(
  key: string,
  overrides: Partial<FeatureDetails> = {},
): FeatureProps {
  return {
    id: `id-${key}`,
    title: key === "email" ? "Email" : "Payments",
    description: `Outcome for ${key}`,
    imageUrl: "",
    details: {
      key,
      groupKey: "foundation",
      icon: "mail",
      inclusion: "optional",
      bullets: ["Send transactional messages"],
      toolGroups: [],
      dependencies: [],
      ...overrides,
    },
  };
}
const email = feature("email", {
  toolGroups: [
    {
      label: "Delivery",
      relationship: "choose-one",
      tools: [
        {
          name: "Resend",
          logoUrl: "/uploads/resend.svg",
          url: "https://resend.com",
        },
      ],
    },
  ],
  dependencies: ["Background jobs"],
  documentationUrl: "/landing/docs/email",
});
const payments = feature("billing", { icon: "credit-card" });
function view(
  features: FeatureProps[] = [payments, email],
  locale: "en" | "es" = "en",
) {
  const featureSection: FeatureSectionProps = {
    heading: "Explore the starter",
    description: "Your product foundation",
    groups: [{ key: "foundation", label: "Foundation" }],
    features,
  };
  return render(
    <NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
      <FeatureSection featureSection={featureSection} />
    </NextIntlClientProvider>,
  );
}
function desktopPanel() {
  const nav = screen.getByRole("navigation");
  const selected = within(nav).getByRole("button", { pressed: true });
  return document.getElementById(selected.getAttribute("aria-controls")!)!;
}

describe("FeatureSection", () => {
  it("defaults to email and renders provider relationships, dependencies, and documentation", () => {
    view();
    const nav = screen.getByRole("navigation", { name: "Explore features" });
    expect(within(nav).getByRole("button", { name: "Email" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const panel = within(desktopPanel());
    expect(panel.getByText("Outcome for email")).toBeInTheDocument();
    expect(panel.getByText("Optional module")).toBeInTheDocument();
    expect(panel.getByText("Choose one provider")).toBeInTheDocument();
    expect(panel.getByText("Background jobs")).toBeInTheDocument();
    expect(
      panel.getByRole("link", { name: "Read documentation" }),
    ).toHaveAttribute("href", "/landing/docs/email");
    expect(panel.getByRole("link", { name: /Resend/ })).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
    expect(panel.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("supports desktop keyboard navigation and updates the selected details", () => {
    view();
    const nav = within(screen.getByRole("navigation"));
    const emailButton = nav.getByRole("button", { name: "Email" });
    const paymentsButton = nav.getByRole("button", { name: "Payments" });
    emailButton.focus();
    fireEvent.keyDown(emailButton, { key: "Home" });
    expect(paymentsButton).toHaveFocus();
    fireEvent.keyDown(paymentsButton, { key: "ArrowUp" });
    expect(emailButton).toHaveFocus();
    fireEvent.click(paymentsButton);
    expect(paymentsButton).toHaveAttribute("aria-pressed", "true");
    expect(
      within(desktopPanel()).getByText("Outcome for billing"),
    ).toBeInTheDocument();
    expect(
      within(desktopPanel()).queryByText("Tools and integrations"),
    ).not.toBeInTheDocument();
    expect(
      within(desktopPanel()).queryByText("Requires"),
    ).not.toBeInTheDocument();
  });

  it("opens mobile details directly after their trigger and allows collapsing them", () => {
    view();
    const buttons = screen.getAllByRole("button", { name: "Payments" });
    const trigger = buttons.find((button) =>
      button.hasAttribute("aria-expanded"),
    )!;
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(
      trigger.getAttribute("aria-controls")!,
    )!;
    expect(trigger.parentElement?.nextElementSibling).toBe(panel);
    expect(within(panel).getByText("Outcome for billing")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("hidden");
  });

  it("keeps legacy and malformed metadata readable under General", () => {
    const malformed = {
      ...payments,
      details: {
        ...payments.details,
        icon: "unknown",
        documentationUrl: "javascript:alert(1)",
      },
    } as unknown as FeatureProps;
    view([
      {
        id: "legacy",
        title: "Legacy feature",
        description: "Still useful",
        imageUrl: "",
      },
      malformed,
    ]);
    expect(
      within(screen.getByRole("navigation")).getByText("General"),
    ).toBeInTheDocument();
    expect(
      within(desktopPanel()).getByText("Still useful"),
    ).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole("navigation")).getByRole("button", {
        name: "Payments",
      }),
    );
    expect(
      within(desktopPanel()).getByText("Outcome for billing"),
    ).toBeInTheDocument();
    expect(within(desktopPanel()).queryByRole("link")).not.toBeInTheDocument();
    expect(desktopPanel().querySelector(".lucide-layers")).toBeInTheDocument();
  });

  it("uses configured group order, puts unknown groups in General, and falls back after content changes", () => {
    const unknown = feature("unknown", { groupKey: "retired" });
    const rendered = view([unknown, email]);
    const nav = screen.getByRole("navigation");
    expect(
      within(nav)
        .getAllByRole("heading")
        .map((heading) => heading.textContent),
    ).toEqual(["Foundation", "General"]);
    rendered.rerender(
      <NextIntlClientProvider locale="en" messages={getMessages("en")}>
        <FeatureSection
          featureSection={{
            heading: "Changed",
            description: "",
            features: [payments],
          }}
        />
      </NextIntlClientProvider>,
    );
    expect(
      within(desktopPanel()).getByText("Outcome for billing"),
    ).toBeInTheDocument();
  });

  it("translates labels and recovers when a provider logo fails", () => {
    view([email], "es");
    const panel = desktopPanel();
    expect(within(panel).getByText("Elige un proveedor")).toBeInTheDocument();
    const logo = panel.querySelector("img")!;
    expect(logo).toHaveAttribute("src", "/uploads/resend.svg");
    fireEvent.error(logo);
    expect(panel.querySelector("img")).toBeNull();
    expect(
      within(panel).getByRole("link", { name: /Resend/ }),
    ).toBeInTheDocument();
  });

  it("renders an empty section without empty navigation or broken panels", () => {
    view([]);
    expect(
      screen.getByRole("heading", { name: "Explore the starter" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(1);
  });
});
