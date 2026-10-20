import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadReleaseUpdate } from "./UpgradeCenter";

afterEach(() => vi.unstubAllGlobals());

describe("downloadReleaseUpdate", () => {
  it("asks for the release kit of the project and saves it", async () => {
    const fetchMock = vi.fn(async () => new Response(new Blob(["zip"]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:kit");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    await downloadReleaseUpdate("acme");

    expect(fetchMock).toHaveBeenCalledWith("/api/scaffold/upgrade", expect.objectContaining({ method: "POST", body: JSON.stringify({ slug: "acme" }) }));
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });

  it("surfaces the server's reason when there is no kit", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "Apply the release notes by hand" }, { status: 422 })));
    await expect(downloadReleaseUpdate("acme")).rejects.toThrow("Apply the release notes by hand");
  });
});
