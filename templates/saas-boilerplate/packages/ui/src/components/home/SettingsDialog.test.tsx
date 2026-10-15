import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "../../test/intl";

vi.mock("@workspace/auth/better-auth/auth-client", () => ({
  authClient: { listAccounts: vi.fn().mockResolvedValue({ data: [] }), listSessions: vi.fn().mockResolvedValue({ data: [] }) },
  useSession: () => ({ data: { user: { name: "Ada", email: "ada@example.com" } } }),
}));

import { SettingsDialog } from "./SettingsDialog";

describe("SettingsDialog", () => {
  it("shows Spanish tab names and a language tab when the app can change language", async () => {
    const onLocaleChange = vi.fn();
    renderWithIntl(<SettingsDialog open onOpenChange={() => {}} onLocaleChange={onLocaleChange} />, { locale: "es" });
    const sectionSelect = screen.getByLabelText("Sección de configuración");
    expect(screen.getAllByText("Mi cuenta").length).toBeGreaterThan(0);
    fireEvent.change(sectionSelect, { target: { value: "language" } });
    fireEvent.change(await screen.findByLabelText("Idioma"), { target: { value: "en" } });
    expect(onLocaleChange).toHaveBeenCalledWith("en");
  });

  it("hides the language tab when no handler is given (desktop)", () => {
    renderWithIntl(<SettingsDialog open onOpenChange={() => {}} />);
    expect(screen.queryByRole("option", { name: "Language & Region" })).toBeNull();
  });
});
