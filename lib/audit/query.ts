export function buildActivityQuery(search: URLSearchParams) {
  const filters = ['_type == "auditEvent"'];
  const params: Record<string, string> = {};
  for (const key of ["userId", "resourceType", "resourceId", "runId", "kind"]) {
    const value = search.get(key)?.slice(0, 200);
    if (value) { filters.push(`${key} == $${key}`); params[key] = value; }
  }
  const action = search.get("action")?.trim().replace(/\.\*$/, "").slice(0, 200);
  if (action) {
    filters.push("(action == $action || action match $actionPrefix)");
    params.action = action;
    params.actionPrefix = `${action}.*`;
  }
  const source = search.get("source");
  if (source && ["manual", "automatic", "external"].includes(source)) {
    filters.push('coalesce(source, select(userName in ["System", "Billing enforcement"] => "automatic", "manual")) == $source');
    params.source = source;
  }
  const status = search.get("status");
  if (status && ["running", "success", "failed", "partial", "skipped", "accepted", "recorded"].includes(status)) {
    filters.push('coalesce(status, "recorded") == $status');
    params.status = status;
  }
  const query = search.get("q")?.trim().slice(0, 200);
  if (query) {
    filters.push("[description, resourceLabel, userName, userEmail, action, resourceId] match $query");
    params.query = `*${query.replace(/[\*?\\]/g, "")}*`;
  }
  for (const key of ["from", "to"]) {
    const raw = search.get(key);
    if (!raw) continue;
    const value = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T${key === "from" ? "00:00:00.000" : "23:59:59.999"}Z` : raw;
    if (Number.isFinite(Date.parse(value))) {
      filters.push(`timestamp ${key === "from" ? ">=" : "<="} $${key}`);
      params[key] = new Date(value).toISOString();
    }
  }
  if (search.get("hideRoutine") === "true") filters.push("routine != true");
  const bounded = (value: string | null, fallback: number, min: number, max: number) => {
    const number = value === null ? NaN : Number(value);
    return Number.isSafeInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
  };
  return { where: filters.join(" && "), params, offset: bounded(search.get("offset"), 0, 0, 1_000_000), limit: bounded(search.get("limit"), 50, 1, 200) };
}

export function csvCell(value: unknown): string {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}
