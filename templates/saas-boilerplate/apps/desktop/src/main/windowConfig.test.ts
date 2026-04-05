import { describe, expect, it } from "vitest";
import { createMainWindowOptions } from "./windowConfig";

describe("createMainWindowOptions", () => {
  it("enables the hardened BrowserWindow security defaults", () => {
    const options = createMainWindowOptions("/tmp/preload.js");

    expect(options.webPreferences?.preload).toBe("/tmp/preload.js");
    expect(options.webPreferences?.sandbox).toBe(true);
    expect(options.webPreferences?.contextIsolation).toBe(true);
    expect(options.webPreferences?.nodeIntegration).toBe(false);
  });
});
