import { expect, test } from "@playwright/test";
import {
  isDemoLoginEnabled,
  isDemoLoginRoleAllowed,
  type DemoLoginRole,
} from "../server/config/demo-mode";

function environment(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return values;
}

test.describe("Demo login safeguards", () => {
  test("is disabled by default in every environment", () => {
    expect(isDemoLoginEnabled(environment({ NODE_ENV: "development" }))).toBe(false);
    expect(isDemoLoginEnabled(environment({ NODE_ENV: "production", DEMO_MODE: "false" }))).toBe(false);

    for (const role of ["ARTIST", "STUDIO", "ENTHUSIAST", "ADMIN"] as DemoLoginRole[]) {
      expect(isDemoLoginRoleAllowed(role, environment({ NODE_ENV: "development" }))).toBe(false);
    }
  });

  test("allows non-admin demo roles only after explicitly opting in", () => {
    const enabledDevelopment = environment({ NODE_ENV: "development", DEMO_MODE: "true" });

    for (const role of ["ARTIST", "STUDIO", "ENTHUSIAST"] as DemoLoginRole[]) {
      expect(isDemoLoginRoleAllowed(role, enabledDevelopment)).toBe(true);
    }
    expect(isDemoLoginRoleAllowed("ADMIN", enabledDevelopment)).toBe(true);
  });

  test("denies admin demo login in production even when demo mode is enabled", () => {
    const enabledProduction = environment({ NODE_ENV: "production", DEMO_MODE: "true" });

    expect(isDemoLoginRoleAllowed("ARTIST", enabledProduction)).toBe(true);
    expect(isDemoLoginRoleAllowed("STUDIO", enabledProduction)).toBe(true);
    expect(isDemoLoginRoleAllowed("ENTHUSIAST", enabledProduction)).toBe(true);
    expect(isDemoLoginRoleAllowed("ADMIN", enabledProduction)).toBe(false);
  });
});