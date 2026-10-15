import { describe, expect, it } from "vitest";
import { getMessages } from "./messages";

describe("getMessages", () => {
  it("returns Spanish over an English base", () => {
    expect(getMessages("es").common.language).toBe("Idioma");
    expect(getMessages("en").common.language).toBe("Language");
  });

  it("returns the same object on repeat calls", () => {
    expect(getMessages("es")).toBe(getMessages("es"));
  });
});
