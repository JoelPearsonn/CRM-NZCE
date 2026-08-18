import { createHmac, createSign, timingSafeEqual } from "node:crypto";
import { loaTabValues, type LoaDocument } from "@/lib/loa-document";

export type DocusignEnvelopeResult = {
  envelopeId: string;
  sigLink: string | null;
};

export type DocusignStatus = "sent" | "delivered" | "completed" | "declined" | "voided" | "other";

export type DocusignClient = {
  createLoaEnvelope(input: {
    document: LoaDocument;
    signerName: string;
    signerEmail: string;
  }): Promise<DocusignEnvelopeResult>;
  getEnvelopeStatus(envelopeId: string): Promise<DocusignStatus>;
};

export type DocusignConfig = {
  templateId: string;
  accountId: string;
  accessToken: string;
  integrationKey: string;
  userId: string;
  privateKey: string;
  basePath: string;
  authServer: string;
  signerRole: string;
};

type EnvMap = Record<string, string | undefined>;

export function readDocusignConfig(env: EnvMap = process.env): DocusignConfig {
  return {
    templateId: env.DOCUSIGN_TEMPLATE_ID?.trim() ?? "",
    accountId: env.DOCUSIGN_ACCOUNT_ID?.trim() ?? "",
    accessToken: env.DOCUSIGN_ACCESS_TOKEN?.trim() ?? "",
    integrationKey: env.DOCUSIGN_INTEGRATION_KEY?.trim() ?? "",
    userId: env.DOCUSIGN_USER_ID?.trim() ?? "",
    privateKey: (env.DOCUSIGN_PRIVATE_KEY ?? "").replaceAll("\\n", "\n").trim(),
    basePath: env.DOCUSIGN_BASE_PATH?.trim() || "https://demo.docusign.net/restapi",
    authServer: env.DOCUSIGN_AUTH_SERVER?.trim() || "account-d.docusign.com",
    signerRole: env.DOCUSIGN_SIGNER_ROLE?.trim() || "Customer",
  };
}

export function isDocusignConfigured(env: EnvMap = process.env) {
  const config = readDocusignConfig(env);
  const hasToken = Boolean(config.accessToken);
  const hasJwt = Boolean(config.integrationKey && config.userId && config.privateKey);
  return Boolean(config.templateId && config.accountId && (hasToken || hasJwt));
}

function base64url(value: Buffer | string) {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64").replaceAll("=", "").replaceAll("+", "-").replaceAll("/", "_");
}

export function signDocusignJwt(config: DocusignConfig, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: config.integrationKey,
      sub: config.userId,
      aud: config.authServer,
      iat: now,
      exp: now + 3600,
      scope: "signature impersonation",
    }),
  );
  const encoded = `${header}.${payload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(encoded);
  sign.end();
  return `${encoded}.${base64url(sign.sign(config.privateKey))}`;
}

async function docusignToken(config: DocusignConfig) {
  if (config.accessToken) return config.accessToken;
  const assertion = signDocusignJwt(config);
  const response = await fetch(`https://${config.authServer}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const body = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || "DocuSign authentication failed.");
  }
  return body.access_token;
}

function textTabs(document: LoaDocument) {
  return Object.entries(loaTabValues(document)).map(([tabLabel, value]) => ({ tabLabel, value }));
}

export function createLiveDocusignClient(env: EnvMap = process.env): DocusignClient {
  const config = readDocusignConfig(env);
  return {
    async createLoaEnvelope({ document, signerName, signerEmail }) {
      const token = await docusignToken(config);
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const created = await fetch(`${config.basePath}/v2.1/accounts/${config.accountId}/envelopes`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          templateId: config.templateId,
          status: "sent",
          templateRoles: [
            {
              roleName: config.signerRole,
              name: signerName,
              email: signerEmail,
              tabs: { textTabs: textTabs(document) },
            },
          ],
        }),
      });
      const envelope = (await created.json()) as { envelopeId?: string; message?: string; errorCode?: string };
      if (!created.ok || !envelope.envelopeId) {
        throw new Error(envelope.message || envelope.errorCode || "DocuSign did not create an envelope.");
      }

      let sigLink: string | null = null;
      const view = await fetch(
        `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelope.envelopeId}/views/recipient`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            authenticationMethod: "email",
            email: signerEmail,
            userName: signerName,
            returnUrl: env.DOCUSIGN_RETURN_URL || "https://nzcenergy.co.uk",
          }),
        },
      );
      if (view.ok) {
        const body = (await view.json()) as { url?: string };
        sigLink = body.url ?? null;
      }
      return { envelopeId: envelope.envelopeId, sigLink };
    },

    async getEnvelopeStatus(envelopeId) {
      const token = await docusignToken(config);
      const response = await fetch(
        `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body = (await response.json()) as { status?: string };
      const status = (body.status ?? "other").toLowerCase();
      if (status === "sent" || status === "delivered" || status === "completed" || status === "declined" || status === "voided") {
        return status;
      }
      return "other";
    },
  };
}

export function getDocusignClient(env: EnvMap = process.env): DocusignClient | null {
  if (!isDocusignConfigured(env)) return null;
  return createLiveDocusignClient(env);
}

export function docusignWebhookSecret(env: EnvMap = process.env) {
  return env.DOCUSIGN_WEBHOOK_SECRET?.trim() || "";
}

export function docusignSignaturesFrom(headers: Headers) {
  const found: string[] = [];
  headers.forEach((value, key) => {
    if (/^x-docusign-signature-\d+$/i.test(key) && value) found.push(value);
  });
  return found;
}

export function verifyDocusignWebhookSignature(
  rawBody: string | Buffer,
  signature: string | null | undefined,
  secret: string,
) {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  const provided = signature.trim();
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function verifyDocusignWebhookRequest(
  rawBody: string | Buffer,
  headers: Headers,
  env: EnvMap = process.env,
) {
  const secret = docusignWebhookSecret(env);
  if (!secret) return false;
  return docusignSignaturesFrom(headers).some((signature) =>
    verifyDocusignWebhookSignature(rawBody, signature, secret),
  );
}

export function parseDocusignWebhook(payload: unknown): { envelopeId: string; status: DocusignStatus } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const data = (record.data && typeof record.data === "object" ? record.data : record) as Record<string, unknown>;
  const summary =
    data.envelopeSummary && typeof data.envelopeSummary === "object"
      ? (data.envelopeSummary as Record<string, unknown>)
      : data;
  const envelopeId = String(data.envelopeId ?? record.envelopeId ?? summary.envelopeId ?? "").trim();
  const raw = String(data.status ?? record.status ?? summary.status ?? record.event ?? "").toLowerCase();
  if (!envelopeId) return null;
  const status: DocusignStatus = raw.includes("complete")
    ? "completed"
    : raw.includes("void")
      ? "voided"
      : raw.includes("decline")
        ? "declined"
        : raw.includes("deliver")
          ? "delivered"
          : raw.includes("sent")
            ? "sent"
            : "other";
  return { envelopeId, status };
}
