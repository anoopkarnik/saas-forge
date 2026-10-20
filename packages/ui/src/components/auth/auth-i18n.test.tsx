import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "../../test/intl";
import LoginCard from "./LoginCard";
import RegisterCard from "./RegisterCard";

const loginProps = {
  showEmail: true, showGoogleProvider: true, showGithubProvider: false, showLinkedinProvider: false,
  onEmailSubmit: vi.fn(), onGoogleProviderSubmit: vi.fn(), onGithubProviderSubmit: vi.fn(),
  onLinkedinProviderSubmit: vi.fn(), onSignUpClick: vi.fn(), onForgotPasswordClick: vi.fn(),
};

describe("auth cards", () => {
  it("render in Spanish", () => {
    renderWithIntl(<LoginCard {...loginProps} />, { locale: "es" });
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeTruthy();
    expect(screen.getByText("¿Olvidaste tu contraseña?")).toBeTruthy();
    expect(screen.getByTitle("Iniciar sesión con Google")).toBeTruthy();
  });

  it("show validation errors in the active language", async () => {
    renderWithIntl(<LoginCard {...loginProps} />, { locale: "es" });
    fireEvent.click(screen.getByRole("button", { name: "Iniciar sesión" }));
    await waitFor(() => expect(screen.getByText("El correo electrónico es obligatorio")).toBeTruthy());
  });

  it("keep the terms links clickable inside the translated sentence", () => {
    const onTermsOfServiceClick = vi.fn();
    renderWithIntl(
      <RegisterCard {...loginProps} onSignInClick={vi.fn()} onTermsOfServiceClick={onTermsOfServiceClick} onPrivacyPolicyClick={vi.fn()} onEmailSubmit={vi.fn()} />,
      { locale: "es" },
    );
    fireEvent.click(screen.getByRole("button", { name: "Términos del servicio" }));
    expect(onTermsOfServiceClick).toHaveBeenCalled();
  });
});
