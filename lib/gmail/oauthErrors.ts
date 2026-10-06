export type OAuthCallbackStage = "token_exchange" | "profile_lookup" | "connection_save";

export function oauthErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { statusCode?: unknown; response?: { status?: unknown } };
  const status = value.statusCode ?? value.response?.status;
  return typeof status === "number" ? status : undefined;
}

export function oauthCallbackErrorCode(error: unknown, stage: OAuthCallbackStage): string {
  return stage === "connection_save" && oauthErrorStatus(error) === 402
    ? "storage_billing"
    : stage;
}

const messages: Record<string, string> = {
  access_denied: "Google authorization was canceled or denied. Connect Gmail again to grant access.",
  invalid_state: "Your connection attempt expired or opened in a different browser session. Connect Gmail again from this page.",
  no_code: "Google did not return a sign-in code. Please connect Gmail again.",
  oauth_init: "The backoffice could not start Google sign-in. Check the Google connection settings.",
  token_exchange: "The backoffice could not complete Google sign-in. Please connect Gmail again.",
  token_exchange_failed: "The backoffice could not complete Google sign-in. Please connect Gmail again.",
  profile_lookup: "Google sign-in completed, but your account details could not be read. Please connect Gmail again and allow account access.",
  connection_save: "Google sign-in completed, but the backoffice could not save the connection. Restore backoffice data storage, then connect Gmail again.",
  storage_billing: "Google sign-in completed, but backoffice data storage is unavailable. Restore database access, then connect Gmail again.",
};

export function oauthErrorMessage(code: string): string {
  return Object.hasOwn(messages, code)
    ? messages[code]
    : "The Gmail connection could not be completed. Please try connecting again.";
}
