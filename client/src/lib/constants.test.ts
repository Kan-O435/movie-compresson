import { describe, expect, it } from "vitest";

import { getFileExtension, isAllowedExtension, targetSizeMbToBytes } from "./constants";

describe("getFileExtension", () => {
  it("extracts a lowercase extension", () => {
    expect(getFileExtension("Sample.MP4")).toBe(".mp4");
  });

  it("returns an empty string when there is no extension", () => {
    expect(getFileExtension("video")).toBe("");
  });
});

describe("isAllowedExtension", () => {
  it("accepts supported video extensions regardless of case", () => {
    expect(isAllowedExtension("clip.mov")).toBe(true);
    expect(isAllowedExtension("clip.MKV")).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    expect(isAllowedExtension("clip.txt")).toBe(false);
    expect(isAllowedExtension("clip")).toBe(false);
  });
});

describe("targetSizeMbToBytes", () => {
  it("converts megabytes to bytes using decimal MB, matching the backend", () => {
    expect(targetSizeMbToBytes(9.5)).toBe(9_500_000);
    expect(targetSizeMbToBytes(49)).toBe(49_000_000);
  });
});
