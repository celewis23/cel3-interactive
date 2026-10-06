import type { MimeAttachment } from "./mime";

export async function readComposeRequest(req: Request) {
  if (!req.headers.get("content-type")?.includes("multipart/form-data")) {
    return { body: await req.json(), attachments: [] as MimeAttachment[] };
  }
  const form = await req.formData();
  const body = JSON.parse(String(form.get("payload") ?? "{}"));
  const attachments: MimeAttachment[] = [];
  for (const file of form.getAll("attachments")) {
    if (!(file instanceof File)) continue;
    attachments.push({ filename: file.name, mimeType: file.type, data: new Uint8Array(await file.arrayBuffer()) });
  }
  return { body, attachments };
}
