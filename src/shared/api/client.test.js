import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "./client";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("uses the configured API base URL with cookie credentials", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "http://api.test/");
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/api/residents");

    expect(fetchMock).toHaveBeenCalledWith("http://api.test/api/residents", {
      credentials: "include",
      headers: {
        Accept: "application/json"
      }
    });
  });

  it("throws a clean ApiError for non-OK JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "Forbidden." }), {
          status: 403,
          headers: { "content-type": "application/json" }
        })
      )
    );

    await expect(apiFetch("/api/lupon/cases")).rejects.toMatchObject({
      name: "ApiError",
      message: "Forbidden.",
      status: 403
    });
    await expect(apiFetch("/api/lupon/cases")).rejects.toBeInstanceOf(ApiError);
  });

  it("throws a useful ApiError when fetch fails before a server response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("NetworkError when attempting to fetch resource.");
      })
    );

    await expect(apiFetch("/api/residents/RBI-1/documents")).rejects.toMatchObject({
      name: "ApiError",
      message: "Network request failed. Check the backend connection and allowed request headers."
    });
  });
});
