import { test, expect } from "@playwright/test";
import { getWebSocketUpgradePath } from "../server/services/websocket-routing";

test.describe("WebSocket upgrade routing", () => {
  test("keeps the Vite HMR root and application WebSocket paths distinct", () => {
    expect(getWebSocketUpgradePath("/")).toBe("/");
    expect(getWebSocketUpgradePath("/ws?token=example")).toBe("/ws");
    expect(getWebSocketUpgradePath("/ws/live?eventId=event-1")).toBe("/ws/live");
  });

  test("ignores malformed or non-origin-form upgrade targets", () => {
    expect(getWebSocketUpgradePath("http://[::1")).toBeNull();
    expect(getWebSocketUpgradePath(undefined)).toBeNull();
  });
});