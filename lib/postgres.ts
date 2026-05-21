import { neon } from "@neondatabase/serverless";

type NeonClient = ReturnType<typeof neon>;

let client: NeonClient | null = null;

function getClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL");
  }
  client ??= neon(databaseUrl);
  return client;
}

export const sql = {
  query: async <T>(query: string, params?: unknown[]): Promise<T[]> => {
    const rows = await getClient().query(query, params ?? []);
    return rows as T[];
  },
};
