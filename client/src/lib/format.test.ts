import { describe, expect, it } from "vitest";

import { calculateReductionPercent, clampProgressPercent, formatBytes } from "./format";

describe("formatBytes", () => {
  it("formats bytes into human readable units", () => {
    expect(formatBytes(500)).toBe("500B");
    expect(formatBytes(9_430_284)).toBe("9.43MB");
    expect(formatBytes(47_116_829)).toBe("47.12MB");
  });

  it("handles invalid input safely", () => {
    expect(formatBytes(0)).toBe("0B");
    expect(formatBytes(-10)).toBe("0B");
    expect(formatBytes(Number.NaN)).toBe("0B");
  });
});

describe("calculateReductionPercent", () => {
  it("calculates percentage reduction", () => {
    expect(calculateReductionPercent(47_116_829, 9_430_284)).toBeCloseTo(80, 0);
  });

  it("avoids division by zero when original size is 0 or invalid", () => {
    expect(calculateReductionPercent(0, 100)).toBe(0);
    expect(calculateReductionPercent(-5, 100)).toBe(0);
  });
});

describe("clampProgressPercent", () => {
  it("clamps values to the 0-100 range", () => {
    expect(clampProgressPercent(-10)).toBe(0);
    expect(clampProgressPercent(150)).toBe(100);
    expect(clampProgressPercent(42.6)).toBe(43);
  });
});
