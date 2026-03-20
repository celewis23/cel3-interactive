import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { Resend } from "resend";
import { buildNotificationEmail } from "@/lib/forms/email";
import { FormField } from "@/lib/forms";

export const runtime = "nodejs";

const DEFAULT_ACCEPTED = "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip";
const DEFAULT_MAX_MB = 10;

// MIME type matcher for wildcard groups and specific extensions
const WILDCARD_MIMES: Record<string, string[]> = {
  "image/*": ["image/jpeg","image/png","image/gif","image/webp","image/svg+xml","image/bmp","image/tiff"],
  "audio/*": ["audio/mpeg","audio/wav","audio/ogg","audio/mp4","audio/aac","audio/flac"],
  "video/*": ["video/mp4","video/webm","video/ogg","video/quicktime","video/x-msvideo"],
};
const EXT_MIMES: Record<string, string[]> = {
  ".pdf":  ["application/pdf"],
  ".doc":  ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls":  ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".txt":  ["text/plain"],
  ".zip":  ["application/zip","application/x-zip-compressed"],
};

function isAllowed(mimeType: string, accepted: string): boolean {
  for (const token of accepted.split(",").map(t => t.trim().toLowerCase())) {
    if (WILDCARD_MIMES[token]?.includes(mimeType)) return true;
    if (EXT_MIMES[token]?.includes(mimeType)) return true;
    if (token === mimeType) return true;
    if (token.endsWith("/*") && mimeType.startsWith(token.slice(0, -1))) return true;
  }
  return false;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const form = await sanityServer.fetch<{
    _id: string; title: string; isPublic: boolean; isActive: boolean; fields: FormField[];
  } | null>(
    `*[_type == "cel3Form" && slug == $slug][0]{ _id, title, isPublic, isActive, fields }`,
    { slug }
  );

  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!form.isPublic) return NextResponse.json({ error: "This form is not available" }, { status: 403 });
  if (!form.isActive) return NextResponse.json({ error: "This form is closed" }, { status: 403 });

  const formData = await req.formData();
  const fields: FormField[] = form.fields || [];
  const answers: Record<string, unknown> = {};
  const files: Record<string, string[]> = {};
  const errors: string[] = [];

  for (const field of fields) {
    if (field.fieldType === "section_header") continue;

    if (field.fieldType === "file_upload") {
      const uploaded = formData.getAll(field.id) as File[];
      const urls: string[] = [];
      for (const file of uploaded) {
        if (!file || !file.size) continue;
        const maxMb = field.maxFileSizeMb || DEFAULT_MAX_MB;
        if (file.size > maxMb * 1024 * 1024) {
          errors.push(`"${field.label}": file exceeds ${maxMb}MB limit`);
          continue;
        }
        const accepted = field.acceptedFileTypes || DEFAULT_ACCEPTED;
        if (!isAllowed(file.type, accepted)) {
          errors.push(`"${field.label}": file type not allowed`);
          continue;
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        const asset = await sanityWriteClient.assets.upload("file", buffer, {
          filename: file.name,
          contentType: file.type,
        });
        urls.push(asset.url);
      }
      if (field.isRequired && urls.length === 0 && !errors.some(e => e.startsWith(`"${field.label}"`))) {
        errors.push(`"${field.label}" is required`);
      }
      if (urls.length > 0) files[field.id] = urls;
      continue;
    }

    if (field.fieldType === "checkbox") {
      const values = formData.getAll(field.id) as string[];
      if (field.isRequired && values.length === 0) errors.push(`"${field.label}" is required`);
      if (values.length > 0) answers[field.id] = values;
    } else {
      const value = String(formData.get(field.id) ?? "").trim();
      if (field.isRequired && !value) errors.push(`"${field.label}" is required`);
      if (value) answers[field.id] = value;
    }
  }

  if (errors.length > 0) return NextResponse.json({ error: errors[0] }, { status: 400 });

  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "";

  const submission = await sanityWriteClient.create({
    _type: "cel3FormSubmission",
    formId: form._id,
    submittedAt: new Date().toISOString(),
    ipAddress,
    answersJson: JSON.stringify(answers),
    filesJson: JSON.stringify(files),
  });

  // Fire-and-forget notifications — do not block the response
  sendNotifications(form._id, form.title, fields, answers, files, submission._id).catch(console.error);

  return NextResponse.json({ ok: true, submissionId: submission._id });
}

async function sendNotifications(
  formId: string,
  formTitle: string,
  fields: FormField[],
  answers: Record<string, unknown>,
  files: Record<string, string[]>,
  submissionId: string,
) {
  const notifications = await sanityServer.fetch<Array<{
    _id: string;
    emailAddress: string;
    isActive: boolean;
    notifyOnEverySubmission: boolean;
    includeFileLinks: boolean;
  }>>(
    `*[_type == "cel3FormNotification" && formId == $formId && isActive == true && notifyOnEverySubmission == true]`,
    { formId }
  );

  if (!notifications.length) return;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || "CEL3 Interactive <noreply@cel3interactive.com>";

  for (const n of notifications) {
    let sentAt: string | null = null;
    let errorMessage: string | null = null;
    try {
      const { subject, html, text } = buildNotificationEmail({
        formTitle,
        submittedAt: new Date().toISOString(),
        fields,
        answers,
        files,
        includeFileLinks: n.includeFileLinks,
      });
      const { error } = await resend.emails.send({ from, to: [n.emailAddress], subject, html, text });
      if (error) throw new Error(error.message);
      sentAt = new Date().toISOString();
    } catch (e: unknown) {
      errorMessage = e instanceof Error ? e.message : "Unknown error";
    }
    await sanityWriteClient.create({
      _type: "cel3FormNotificationLog",
      formSubmissionId: submissionId,
      formNotificationId: n._id,
      sentAt,
      errorMessage,
    }).catch(console.error);
  }
}
