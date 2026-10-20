import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeroCodeBlock } from "./HeroCodeBlock";
describe("HeroCodeBlock", () => {
  it("copies the command through a named control and announces completion", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<HeroCodeBlock code="npx saas-forge@latest" language="bash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Command copied"));
    expect(writeText).toHaveBeenCalledWith("npx saas-forge@latest");
  });
  it("shows a recoverable message when clipboard access is denied", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    render(<HeroCodeBlock code="npx saas-forge@latest" language="bash" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy command" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("select and copy"));
  });
});
