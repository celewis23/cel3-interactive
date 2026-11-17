import type { GmailMessageHeader } from "./types";

/** Parse mailbox lists without splitting quoted display names at their commas. */
export function mailboxAddresses(value: string): string[] {
  const mailboxes = value.match(/(?:"(?:[^"\\]|\\.)*"|[^",])+/g) ?? [];
  return mailboxes.flatMap(mailbox => {
    const address = mailbox.match(/<([^<>]+)>/)?.[1]?.trim()
      ?? mailbox.trim();
    return /^[^\s<>@]+@[^\s<>@]+$/.test(address) ? [address] : [];
  });
}

export function replyRecipients(headers: GmailMessageHeader, ownEmail: string, all = false) {
  const seen = new Set([ownEmail.trim().toLowerCase()].filter(Boolean));
  const unique = (addresses: string[]) => addresses.filter(address => {
    const key = address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const to = unique(mailboxAddresses(headers.replyTo || headers.from));
  // Replying to a sent message targets its original recipients, not ourselves.
  if (all || !to.length) to.push(...unique(mailboxAddresses(headers.to)));
  const cc = all ? unique(mailboxAddresses(headers.cc)) : [];
  return { to, cc };
}
