import { validateCredentials } from "./auth";
import { verifyPassword } from "./staffPassword";
import { sanityServer } from "@/lib/sanityServer";

export const OWNER_CREDENTIALS_ID = "adminCredentials.owner";

/** Once changed in the backoffice, the configured password no longer grants access. */
export async function verifyOwnerPassword(username: string, password: string): Promise<boolean> {
  if (!process.env.ADMIN_USERNAME || username !== process.env.ADMIN_USERNAME) return false;
  const credentials = await sanityServer.fetch<{ passwordHash: string; passwordSalt: string } | null>(
    `*[_id == $id][0]{ passwordHash, passwordSalt }`,
    { id: OWNER_CREDENTIALS_ID },
  );
  if (credentials) return verifyPassword(password, credentials.passwordHash, credentials.passwordSalt);
  return Boolean(process.env.ADMIN_PASSWORD) && validateCredentials(username, password);
}
