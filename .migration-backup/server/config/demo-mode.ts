export const DEMO_LOGIN_ROLES = ["ARTIST", "STUDIO", "ENTHUSIAST", "ADMIN"] as const;

export type DemoLoginRole = (typeof DEMO_LOGIN_ROLES)[number];

export function isDemoLoginEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.DEMO_MODE === "true";
}

export function isDemoLoginRoleAllowed(
  role: DemoLoginRole,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return isDemoLoginEnabled(env) && !(role === "ADMIN" && env.NODE_ENV === "production");
}