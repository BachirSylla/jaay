import { describe, expect, it } from "vitest";
import { previewPathFor } from "./image";

describe("previewPathFor", () => {
  it("derives the JPEG preview next to the photo", () => {
    expect(previewPathFor("s/p/abc.webp")).toBe("s/p/abc.og.jpg");
    expect(previewPathFor("s/p/abc.jpg")).toBe("s/p/abc.og.jpg");
    expect(previewPathFor("s/p/webp")).toBe("s/p/webp");
  });
});
