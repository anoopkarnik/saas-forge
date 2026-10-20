import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate, formatNumber, formatRelative } from "./format";

const date = new Date(2026, 2, 5, 12); // 5 March 2026, local time

describe("formatters", () => {
  it("keeps today's English output when no locale is passed", () => {
    expect(formatDate(date)).toBe("March 5, 2026");
    expect(formatCurrency(1234, "USD")).toBe("$12.34");
  });

  it("formats in Spanish", () => {
    expect(formatDate(date, "es")).toBe("5 de marzo de 2026");
    expect(formatNumber(1234.5, "es")).toBe("1234,5");
    expect(formatCurrency(1234, "USD", "es")).toContain("12,34");
  });

  it("formats relative time against a fixed now", () => {
    const now = new Date(2026, 2, 8, 12);
    expect(formatRelative(date, "en", now)).toBe("3 days ago");
    expect(formatRelative(date, "es", now)).toBe("hace 3 días");
  });
});
