import { google } from "googleapis";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

const TOKEN_DOC_ID = "gmail-oauth-token";

export type StoredTokens = {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  token_type: string;
  email: string;
  connectedAt: string;
};

export function createOAuthClient() {
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/email/auth/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_WORKSPACE_CLIENT_ID!,
    process.env.GOOGLE_WORKSPACE_CLIENT_SECRET!,
    redirectUri
  );
}

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/photoslibrary.readonly",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/chat.spaces.readonly",
  "https://www.googleapis.com/auth/chat.messages",
];

export async function getStoredTokens(): Promise<StoredTokens | null> {
  try {
    const doc = await sanityServer.getDocument<{
      accessToken: string;
      refreshToken: string;
      expiryDate: number;
      tokenType: string;
      email: string;
      connectedAt: string;
    }>(TOKEN_DOC_ID);
    if (!doc) return null;
    return {
      access_token: doc.accessToken,
      refresh_token: doc.refreshToken,
      expiry_date: doc.expiryDate,
      token_type: doc.tokenType || "Bearer",
      email: doc.email,
      connectedAt: doc.connectedAt,
    };
  } catch {
    return null;
  }
}

export async function storeTokens(
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    token_type?: string | null;
  },
  email: string,
  connectedAt?: string
): Promise<void> {
  await sanityWriteClient.createOrReplace({
    _id: TOKEN_DOC_ID,
    _type: "gmailOAuthToken",
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token || "",
    expiryDate: tokens.expiry_date || 0,
    tokenType: tokens.token_type || "Bearer",
    email,
    connectedAt: connectedAt || new Date().toISOString(),
  });
}

export async function clearTokens(): Promise<void> {
  try {
    await sanityWriteClient.delete(TOKEN_DOC_ID);
  } catch { /* already deleted */ }
}

export async function getAuthenticatedClient(): Promise<{ oauth2Client: ReturnType<typeof createOAuthClient>; email: string } | null> {
  const tokens = await getStoredTokens();
  if (!tokens) return null;

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
  });

  // Refresh if expired or expiring in <60s
  const needsRefresh = !tokens.expiry_date || tokens.expiry_date < Date.now() + 60_000;
  if (needsRefresh && tokens.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      await storeTokens(credentials, tokens.email, tokens.connectedAt);
    } catch (err) {
      console.error("GMAIL_TOKEN_REFRESH_ERROR:", err);
      return null;
    }
  }

  return { oauth2Client, email: tokens.email };
}
