import { describe, expect, it } from "vite-plus/test";
import { hrefFor, parseRoute } from "./router";

describe("route mapping", () => {
  it("maps the root and gallery paths to the gallery", () => {
    expect(parseRoute("/")).toBe("gallery");
    expect(parseRoute("/gallery")).toBe("gallery");
    expect(parseRoute("/gallery/")).toBe("gallery");
  });

  it("maps the editor path to the editor", () => {
    expect(parseRoute("/editor")).toBe("editor");
    expect(parseRoute("/editor/")).toBe("editor");
  });

  it("falls back to the gallery for unknown paths", () => {
    expect(parseRoute("/missing")).toBe("gallery");
  });

  it("writes clean paths", () => {
    expect(hrefFor("gallery")).toBe("/");
    expect(hrefFor("editor")).toBe("/editor");
  });
});
