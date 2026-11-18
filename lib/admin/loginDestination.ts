/** Only allow the specific local pairing route through the sign-in flow. */
export function loginDestination(search: string) {
  const next = new URLSearchParams(search).get("next");
  if (!next) return "/admin";
  try {
    const url = new URL(next, "https://backoffice.invalid");
    if (url.origin !== "https://backoffice.invalid" || url.pathname !== "/admin/meterwise/android/connect") return "/admin";
    const challenge = url.searchParams.get("challenge") ?? "";
    return /^[a-f0-9]{64}$/.test(challenge) ? `${url.pathname}?challenge=${challenge}` : "/admin";
  } catch { return "/admin"; }
}
