import { describe, it, expect } from "vitest";
import { unwrap } from "@/services/api/apiClient";
import type { ApiEnvelope } from "@/types";

describe("unwrap", () => {
  it("returns data on success", async () => {
    const env: ApiEnvelope<{ x: number }> = { success: true, data: { x: 1 }, request_id: "r" };
    const res = await unwrap(Promise.resolve({ data: env }));
    expect(res.x).toBe(1);
  });
  it("throws on error envelope", async () => {
    const env: ApiEnvelope<unknown> = { success: false, data: {}, request_id: "r", error: { code: "E", message: "boom" } };
    await expect(unwrap(Promise.resolve({ data: env }))).rejects.toThrow("boom");
  });
});
