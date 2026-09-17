import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

const readActions = new Set([
  "/api/cron/billing-enforcement", "/api/cron/task-reminders", "/api/cron/lead-generator", "/api/cron/campaigns",
  "/api/admin/notifications/email", "/api/admin/email/auth/callback", "/api/portal/auth/verify",
  "/api/campaign/unsubscribe/[token]",
]);
// Page-view/click telemetry already has its own analytics store; it is not a
// business action. Excluding it also avoids generating a log for every visit.
const excluded = new Set(["/api/analytics/collect"]);
const check = process.argv.includes("--check");
let changed = 0;
let covered = 0;

function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) { visit(path); continue; }
    if (entry.name !== "route.ts") continue;
    const route = `/${relative("app", directory).replaceAll("\\", "/")}`;
    if (excluded.has(route)) continue;
    let source = readFileSync(path, "utf8");
    const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    const methods = [];
    for (const node of ast.statements) {
      if (!ts.isFunctionDeclaration(node) || !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      const method = node.name?.text;
      if (["POST", "PUT", "PATCH", "DELETE"].includes(method) || method === "GET" && readActions.has(route)) methods.push(method);
    }
    covered += (source.match(/export const (GET|POST|PUT|PATCH|DELETE) = withActivity\(/g) ?? []).length;
    if (!methods.length) continue;
    if (check) { console.error(`Missing activity coverage: ${route} ${methods.join(", ")}`); process.exitCode = 1; continue; }
    if (!source.includes('from "@/lib/audit/withActivity"')) source = `import { withActivity } from "@/lib/audit/withActivity";\n${source}`;
    for (const method of methods) {
      source = source.replace(new RegExp(`export async function ${method}\\(`), `async function handleActivity${method}(`);
      source += `\nexport const ${method} = withActivity(${JSON.stringify(route)}, ${JSON.stringify(method)}, handleActivity${method});\n`;
    }
    writeFileSync(path, source);
    covered += methods.length;
    changed++;
  }
}
visit("app/api");
console.log(`${covered} activity handlers covered; ${changed} route files updated.`);
