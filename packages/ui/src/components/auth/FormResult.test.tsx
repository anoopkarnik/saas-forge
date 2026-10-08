import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormResult } from "./FormResult";
describe("FormResult announcements", () => {
  it("announces a server error", () => {
    render(<FormResult type="error" message="Sign-in failed" />);
    expect(screen.getByRole("alert").textContent).toContain("Sign-in failed");
  });
  it("announces successful completion", () => {
    render(<FormResult type="success" message="Account created" />);
    expect(screen.getByRole("status").textContent).toContain("Account created");
  });
});
