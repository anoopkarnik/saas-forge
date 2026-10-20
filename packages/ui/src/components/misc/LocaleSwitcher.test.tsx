import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "../../test/intl";
import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
  it("lists every locale by its own name and reports the choice", () => {
    const onChange = vi.fn();
    renderWithIntl(<LocaleSwitcher value="en" onChange={onChange} />);
    const select = screen.getByLabelText("Language");
    expect(screen.getByRole("option", { name: "Español" })).toBeTruthy();
    fireEvent.change(select, { target: { value: "es" } });
    expect(onChange).toHaveBeenCalledWith("es");
  });

  it("labels itself in the active language", () => {
    renderWithIntl(<LocaleSwitcher value="es" onChange={() => {}} />, { locale: "es" });
    expect(screen.getByLabelText("Idioma")).toBeTruthy();
  });
});
