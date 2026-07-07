// Applies a SQL migration file against DATABASE_URL.
// Usage: node scripts/apply-migration.mjs db/migrations/004_web_analytics.sql
import fs from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/apply-migration.mjs <path-to-sql-file>");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sqlText = fs.readFileSync(path.resolve(process.cwd(), file), "utf8");
// The Neon HTTP driver runs one statement per request; split on
// statement-terminating semicolons (none of our migrations use $$ bodies).
const statements = sqlText
  .split(/;\s*(?:\r?\n|$)/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const sql = neon(process.env.DATABASE_URL);
for (const statement of statements) {
  const label = statement.replace(/\s+/g, " ").slice(0, 72);
  process.stdout.write(`→ ${label}...\n`);
  await sql.query(statement);
}
console.log(`Applied ${statements.length} statement(s) from ${file}`);
