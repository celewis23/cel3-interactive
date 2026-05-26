export function normalizeContractVariables(input: Record<string, unknown> | null | undefined): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    variables[key] = value == null ? "" : String(value);
  }
  return variables;
}

export function renderContractBody(body: string, vars: Record<string, string>): string {
  let result = body;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value || "");
  }
  return result;
}
