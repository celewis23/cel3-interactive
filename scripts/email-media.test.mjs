import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { simpleParser } from "mailparser";
import sharp from "sharp";

const require = createRequire(import.meta.url);
function load(path, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } });
  const loadedModule = { exports: {} };
  runInThisContext(`(function(require,module,exports){${outputText}\n})`, { filename: path })(name => {
    if (Object.hasOwn(dependencies, name)) return dependencies[name];
    if (name === "next/server") return require(name);
    throw new Error(`Unexpected dependency: ${name}`);
  }, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const mime = load("lib/gmail/mime.ts");
const preview = load("lib/gmail/attachment-preview.ts");
const imagePreview = load("lib/gmail/image-preview.ts", { sharp });
const image = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9WQAAAAASUVORK5CYII=", "base64");
const imageHtml = `<img src="data:image/png;base64,${image.toString("base64")}" alt="test">`;

test("MIME parser recovers separate inline images and file attachments, including Unicode names", async () => {
  const raw = mime.buildRawMessage({ to: "reader@example.com", subject: "Photos — café", htmlBody: `<p>Hello</p>${imageHtml}${imageHtml}`,
    attachments: [{ filename: "café photo.png", mimeType: "image/png", data: image }] });
  assert.match(raw, /^[a-zA-Z0-9_-]+$/);
  const parsed = await simpleParser(Buffer.from(raw, "base64url"), { skipImageLinks: true });
  assert.equal(parsed.subject, "Photos — café");
  assert.equal(parsed.attachments.length, 2);
  const inline = parsed.attachments.find(a => a.contentDisposition === "inline");
  const attached = parsed.attachments.find(a => a.contentDisposition === "attachment");
  assert.ok(inline.contentId);
  assert.deepEqual(inline.content, image);
  assert.deepEqual(attached.content, image);
  assert.equal(attached.filename, "café photo.png");
  assert.equal((parsed.html.match(/cid:/g) ?? []).length, 2);
  assert.doesNotMatch(parsed.html, /data:image/);
  assert.match(parsed.text, /Hello/);
});

test("image-only replies retain threading and recipients", async () => {
  const parsed = await simpleParser(mime.buildMimeMessage({ to: "a@example.com", cc: "b@example.com", bcc: "c@example.com", subject: "Re: Image", htmlBody: imageHtml,
    inReplyTo: "<parent@example.com>", references: "<first@example.com> <parent@example.com>" }), { skipImageLinks: true });
  assert.equal(parsed.inReplyTo, "<parent@example.com>");
  assert.deepEqual(parsed.references, ["<first@example.com>", "<parent@example.com>"]);
  assert.equal(parsed.cc.value[0].address, "b@example.com");
  assert.equal(parsed.bcc.value[0].address, "c@example.com");
  assert.equal(mime.hasMessageContent(imageHtml), true);
  assert.equal(mime.hasMessageContent("<p>&nbsp;<br></p>"), false);
});

test("reject header injection, unsupported inline files and excessive total size", () => {
  assert.throws(() => mime.buildRawMessage({ to: "a@example.com\r\nBcc: injected@example.com", subject: "Test" }), /header/);
  assert.throws(() => mime.buildRawMessage({ to: "a@example.com", subject: "Test", htmlBody: '<img src="data:image/svg+xml;base64,PHN2Zz4=">' }), /PNG/);
  assert.throws(() => mime.buildRawMessage({ to: "a@example.com", subject: "Test", htmlBody: imageHtml,
    attachments: [{ filename: "big.bin", mimeType: "application/octet-stream", data: new Uint8Array(mime.MAX_ATTACHMENT_BYTES) }] }), /25 MB/);
});

test("HTML/SVG attachments are download-only and filenames cannot inject response headers", () => {
  for (const type of ["text/html", "image/svg+xml", "application/javascript"]) {
    const headers = preview.attachmentHeaders('photo"\r\nInjected: true.html', type, true, 4);
    assert.equal(headers["Content-Type"], "application/octet-stream");
    assert.match(headers["Content-Disposition"], /^attachment;/);
    assert.doesNotMatch(headers["Content-Disposition"], /\r|\n/);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
    assert.match(headers["Content-Security-Policy"], /sandbox/);
  }
  assert.match(preview.attachmentHeaders("photo.png", "image/png", true, 4)["Content-Disposition"], /^inline;/);
});

test("attachment response uses verified metadata and only the exact Buffer slice", async () => {
  const backing = Buffer.alloc(8192, 88); image.copy(backing, 73);
  const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/route.ts", {
    "@/lib/admin/permissions": { requirePermission: async () => null },
    "@/lib/gmail/attachment-preview": preview,
    "@/lib/gmail/image-preview": imagePreview,
    "@/lib/gmail/api": { getVerifiedAttachment: async () => ({ data: backing.subarray(73, 73 + image.length), attachment: { filename: "real.png", mimeType: "image/png" } }) },
  });
  const response = await route.GET({ nextUrl: new URL("https://example.com/?inline=1&mime=text/html&filename=evil.html") }, { params: Promise.resolve({ messageId: "m", attachmentId: "a" }) });
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), image);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.match(response.headers.get("content-disposition"), /real.png/);
});

test("preview requires email view permission before retrieving any bytes", async () => {
  let reads = 0;
  const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/route.ts", {
    "@/lib/admin/permissions": { requirePermission: async () => new Response(null, { status: 403 }) },
    "@/lib/gmail/attachment-preview": preview,
    "@/lib/gmail/image-preview": imagePreview,
    "@/lib/gmail/api": { getVerifiedAttachment: async () => { reads++; } },
  });
  const response = await route.GET({}, { params: Promise.resolve({ messageId: "m", attachmentId: "a" }) });
  assert.equal(response.status, 403); assert.equal(reads, 0);
});

test("Drive saves require both permissions and upload the verified private attachment", async () => {
  for (const blocked of ["email", "drive", null]) {
    let uploads = 0, reads = 0;
    const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/drive/route.ts", {
      "@/lib/audit/withActivity": { withActivity: (_path, _method, handler) => handler },
      "@/lib/admin/permissions": { requirePermission: async (_req, resource) => resource === blocked ? new Response(null, { status: 403 }) : null },
      "@/lib/gmail/api": { getVerifiedAttachment: async () => { reads++; return { attachment: { filename: "real.png", mimeType: "image/png" }, data: image }; } },
      "@/lib/google/drive": { uploadFile: async opts => { uploads++; assert.deepEqual(opts, { name: "real.png", mimeType: "image/png", data: image }); return { id: "drive-file", name: "real.png" }; } },
    });
    const response = await route.POST({}, { params: Promise.resolve({ messageId: "m", attachmentId: "a" }) });
    assert.equal(response.status, blocked ? 403 : 201);
    assert.equal(uploads, blocked ? 0 : 1); assert.equal(reads, blocked ? 0 : 1);
  }
});

test("reply endpoint accepts an image-only body plus attachments and preserves thread headers", async () => {
  const composeRequest = load("lib/gmail/compose-request.ts");
  let sent;
  const route = load("app/api/admin/email/reply/route.ts", {
    "@/lib/audit/withActivity": { withActivity: (_path, _method, handler) => handler },
    "@/lib/admin/permissions": { requirePermission: async () => null },
    "@/lib/gmail/compose-request": composeRequest,
    "@/lib/gmail/mime": mime,
    "@/lib/gmail/api": { replyToThread: async opts => { sent = opts; return { messageId: "sent", threadId: opts.threadId }; } },
  });
  const form = new FormData();
  form.set("payload", JSON.stringify({ threadId: "thread", to: "a@example.com", subject: "Images", htmlBody: imageHtml, inReplyTo: "<original>" }));
  form.append("attachments", new File([image], "photo.png", { type: "image/png" }));
  const response = await route.POST(new Request("https://example.com/reply", { method: "POST", body: form }));
  assert.equal(response.status, 201); assert.equal(sent.threadId, "thread"); assert.equal(sent.inReplyTo, "<original>");
  assert.deepEqual(Buffer.from(sent.attachments[0].data), image);
});

function gmailApi(gmail) {
  return load("lib/gmail/api.ts", {
    "./mime": mime,
    "@/lib/email/inlineHtml": { inlineEmailCss: html => html },
    "googleapis": { google: { gmail: () => gmail } },
    "./client": { getAuthenticatedClient: async () => ({ oauth2Client: {}, email: "owner@example.com" }) },
  });
}

test("attachment lookup survives changing Gmail tokens and duplicate filenames", async () => {
  const part = token => ({ partId: "1", filename: "logo.jpg", mimeType: "image/jpeg", body: { attachmentId: token, size: image.length } });
  const api = gmailApi({ users: {
    threads: { get: async () => ({ data: { messages: [{ id: "message", payload: { parts: [part("inbox-token")] } }] } }) },
    messages: {
      get: async () => ({ data: { payload: { parts: [ { ...part("other-token"), partId: "0" }, part("fresh-token") ] } } }),
      attachments: { get: async opts => { assert.equal(opts.messageId, "message"); assert.equal(opts.id, "fresh-token"); return { data: { data: image.toString("base64url") } }; } },
    },
  } });
  const thread = await api.getThread("thread");
  const reference = thread.messages[0].attachments[0].attachmentId;
  assert.equal(reference, "part:1");
  const loaded = await api.getVerifiedAttachment("message", reference);
  assert.deepEqual(loaded.data, image);
  assert.equal(loaded.attachment.filename, "logo.jpg");
  await assert.rejects(api.getVerifiedAttachment("message", "part:99"), /not found/);
  await assert.rejects(api.getVerifiedAttachment("message", "foreign-token"), /not found/);
});

test("embedded attachments work for nested and root parts without download tokens", async () => {
  for (const partId of ["0.2", ""]) {
    const part = { partId, filename: "inline.png", mimeType: "image/png", headers: [{ name: "Content-ID", value: "<logo>" }], body: { data: image.toString("base64url"), size: image.length } };
    const payload = partId ? { parts: [{ parts: [part] }] } : part;
    const api = gmailApi({ users: {
      threads: { get: async () => ({ data: { messages: [{ payload }] } }) },
      messages: { get: async () => ({ data: { payload } }), attachments: { get: async () => { throw Error("Embedded bytes must not call attachments.get"); } } },
    } });
    const attachment = (await api.getThread("thread")).messages[0].attachments[0];
    assert.equal(attachment.inline, true);
    assert.equal(attachment.contentId, "logo");
    assert.deepEqual((await api.getVerifiedAttachment("message", attachment.attachmentId)).data, image);
  }
});

test("TIFF labeled as JPEG gets a browser preview; downloads keep the exact original", async () => {
  const tiff = await sharp({ create: { width: 32, height: 16, channels: 4, background: { r: 0, g: 160, b: 220, alpha: 1 } } }).tiff().toBuffer();
  const route = load("app/api/admin/email/attachment/[messageId]/[attachmentId]/route.ts", {
    "@/lib/admin/permissions": { requirePermission: async () => null },
    "@/lib/gmail/attachment-preview": preview,
    "@/lib/gmail/image-preview": imagePreview,
    "@/lib/gmail/api": { getVerifiedAttachment: async () => ({ data: tiff, attachment: { filename: "logo.jpg", mimeType: "image/jpeg" } }) },
  });
  const context = { params: Promise.resolve({ messageId: "message", attachmentId: "part:1" }) };
  const rendered = await route.GET({ nextUrl: new URL("https://example.com/?inline=1") }, context);
  assert.equal(rendered.headers.get("content-type"), "image/webp");
  assert.equal(rendered.headers.get("x-attachment-preview-converted"), "1");
  const decoded = await sharp(Buffer.from(await rendered.arrayBuffer())).metadata();
  assert.equal(decoded.width, 32); assert.equal(decoded.height, 16);
  const original = await route.GET({ nextUrl: new URL("https://example.com/") }, context);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), tiff);
  assert.equal(original.headers.get("x-attachment-preview-converted"), null);
  assert.match(original.headers.get("content-disposition"), /filename="logo.jpg"/);
});

test("ordinary images and active attachments bypass the TIFF decoder", async () => {
  for (const [data, type] of [[image, "image/png"], [Buffer.from('<svg onload="alert(1)"></svg>'), "image/svg+xml"]]) {
    const result = await imagePreview.renderImagePreview(data, type);
    assert.equal(result.converted, false);
    assert.deepEqual(result.data, data);
  }
});
