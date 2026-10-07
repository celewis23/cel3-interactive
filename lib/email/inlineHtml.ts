import juice from "juice";

/**
 * Email clients (Gmail, Outlook, Apple Mail) only reliably honor <style> rules
 * that have been inlined onto each element — a <style> block anywhere else,
 * especially outside <head>, is commonly stripped. This moves all CSS rules
 * (wherever the <style> tags live) into inline style="" attributes so
 * hand-authored or pasted HTML survives real inboxes, not just a browser preview.
 */
export function inlineEmailCss(html: string): string {
  if (!html) return html;
  try {
    return juice(html);
  } catch {
    return html;
  }
}
