import { afterEach, describe, expect, it } from "vitest";

import { buildApiUrl, getApiBaseUrl } from "./api";

const ENV_KEY = "NEXT_PUBLIC_API_BASE_URL";
const originalEnv = process.env[ENV_KEY];

afterEach(() => {
  if (originalEnv === undefined) {
    delete process.env[ENV_KEY];
  } else {
    process.env[ENV_KEY] = originalEnv;
  }
});

describe("getApiBaseUrl", () => {
  it("falls back to the local default when unset", () => {
    delete process.env[ENV_KEY];
    expect(getApiBaseUrl()).toBe("http://127.0.0.1:8000");
  });

  it("strips a trailing slash from the configured base URL", () => {
    process.env[ENV_KEY] = "http://localhost:8000/";
    expect(getApiBaseUrl()).toBe("http://localhost:8000");
  });
});

describe("buildApiUrl", () => {
  it("does not produce a double slash when the base URL ends with '/'", () => {
    process.env[ENV_KEY] = "http://localhost:8000/";
    expect(buildApiUrl("/jobs/abc")).toBe("http://localhost:8000/jobs/abc");
  });

  it("adds a leading slash to the path when missing", () => {
    process.env[ENV_KEY] = "http://localhost:8000";
    expect(buildApiUrl("jobs/abc")).toBe("http://localhost:8000/jobs/abc");
  });
});
