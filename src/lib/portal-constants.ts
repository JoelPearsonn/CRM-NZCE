export const PORTAL_COOKIE = "nzce_portal_session";

type EnvMap = Record<string, string | undefined>;

export function portalDemoCredentials(env: EnvMap = process.env) {
  return {
    email: env.PORTAL_DEMO_EMAIL?.trim().toLowerCase() ?? "",
    password: env.PORTAL_DEMO_PASSWORD ?? "",
    token: env.PORTAL_DEMO_TOKEN?.trim() ?? "",
  };
}
