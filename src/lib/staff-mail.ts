export const DEFAULT_STAFF_MAIL_FROM = "info@nzcenergy.co.uk";
export const MAIL_NOT_SET_UP =
  "Mail isn’t set up on this desk (RESEND_API_KEY is missing). No email was sent and no account was created.";

type EnvMap = Record<string, string | undefined>;

export function staffMailFrom(env: EnvMap = process.env) {
  return env.CRM_MAIL_FROM?.trim() || DEFAULT_STAFF_MAIL_FROM;
}

export function staffMailerReady(env: EnvMap = process.env) {
  return Boolean(env.RESEND_API_KEY?.trim());
}

export function deskPublicOrigin(
  env: EnvMap = process.env,
  requestOrigin?: string | null,
) {
  const fromEnv = env.CRM_PUBLIC_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const host = requestOrigin?.trim();
  return host ? host.replace(/\/$/, "") : null;
}

export async function sendStaffVerificationEmail(
  input: { to: string; verifyUrl: string },
  env: EnvMap = process.env,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: true } | { error: string }> {
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) return { error: MAIL_NOT_SET_UP };

  let response: Response;
  try {
    response = await fetchFn("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: staffMailFrom(env),
        to: [input.to],
        subject: "NZCE desk — create your password",
        text: [
          "Open this link on the desk to create your password.",
          "It expires in one hour and can be used once.",
          "",
          input.verifyUrl,
        ].join("\n"),
      }),
    });
  } catch {
    return { error: "The verification email could not be sent. No account was created." };
  }

  if (!response.ok) {
    return { error: "The verification email could not be sent. No account was created." };
  }
  return { ok: true };
}
