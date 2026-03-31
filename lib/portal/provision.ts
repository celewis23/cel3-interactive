import { createFolder, listFiles, uploadFile } from "@/lib/google/drive";
import { getCustomer } from "@/lib/stripe/billing";
import { syncContactProfileFromPipeline } from "@/lib/contacts/unifiedSync";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { syncStripeCustomerToPipelineContact } from "@/lib/stripe/sync";

type PortalUserRecord = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  driveRootFolderId: string | null;
  status: string;
  lastLoginAt: string | null;
  invitationSentAt: string | null;
  mustChangePassword: boolean | null;
  _createdAt: string;
};

function sanitizeFolderName(input: string) {
  const cleaned = input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Client Portal";
}

export async function getOrCreateDriveFolderByName(name: string, parentId?: string) {
  const normalized = sanitizeFolderName(name);
  const { files } = await listFiles({ folderId: parentId, foldersOnly: true, pageSize: 200 });
  const existing = files.find((file) => file.isFolder && file.name.trim().toLowerCase() === normalized.toLowerCase());
  if (existing) return existing;
  return createFolder(normalized, parentId);
}

function getPortalFolderBaseName(input: { company?: string | null; name?: string | null; email?: string | null }) {
  const candidate = input.company?.trim() || input.name?.trim() || input.email?.trim() || "Client Portal";
  return sanitizeFolderName(candidate);
}

export async function ensurePortalAccessForStripeCustomer(customerId: string): Promise<PortalUserRecord> {
  const customer = await getCustomer(customerId);
  if (!customer) {
    throw new Error("Stripe customer not found");
  }
  if (!customer.email) {
    throw new Error("This customer needs an email address before portal access can be created");
  }

  const pipelineContact = await syncStripeCustomerToPipelineContact(customer, { source: "Stripe", stage: "won" });
  await syncContactProfileFromPipeline(pipelineContact._id).catch(() => null);

  const company = pipelineContact.company ?? customer.description ?? null;
  const name = customer.name ?? pipelineContact.name ?? customer.email;
  const folderName = getPortalFolderBaseName({ company, name, email: customer.email });
  const rootParentId = process.env.GOOGLE_DRIVE_PORTAL_ROOT_FOLDER_ID || undefined;
  const rootFolder = await getOrCreateDriveFolderByName(folderName, rootParentId);
  await getOrCreateDriveFolderByName("Requests", rootFolder.id).catch(() => null);

  const existing = await sanityServer.fetch<PortalUserRecord | null>(
    `*[_type == "clientPortalUser" && (stripeCustomerId == $stripeCustomerId || email == $email)][0]{
      _id, email, name, company, stripeCustomerId, pipelineContactId, driveRootFolderId,
      status, lastLoginAt, invitationSentAt, mustChangePassword, _createdAt
    }`,
    { stripeCustomerId: customer.id, email: customer.email.toLowerCase() }
  );

  if (existing) {
    await sanityWriteClient.patch(existing._id).set({
      email: customer.email.toLowerCase(),
      name,
      company,
      stripeCustomerId: customer.id,
      pipelineContactId: pipelineContact._id,
      driveRootFolderId: existing.driveRootFolderId ?? rootFolder.id,
      status: existing.status === "suspended" ? "suspended" : existing.status || "ready",
    }).commit();
    return {
      ...existing,
      email: customer.email.toLowerCase(),
      name,
      company,
      stripeCustomerId: customer.id,
      pipelineContactId: pipelineContact._id,
      driveRootFolderId: existing.driveRootFolderId ?? rootFolder.id,
      status: existing.status === "suspended" ? "suspended" : existing.status || "ready",
    };
  }

  const created = await sanityWriteClient.create({
    _type: "clientPortalUser",
    email: customer.email.toLowerCase(),
    name,
    company,
    stripeCustomerId: customer.id,
    pipelineContactId: pipelineContact._id,
    driveRootFolderId: rootFolder.id,
    passwordHash: null,
    passwordSalt: null,
    mustChangePassword: false,
    invitationSentAt: null,
    status: "ready",
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  });

  return created as unknown as PortalUserRecord;
}

export async function createPortalTicketArtifacts(params: {
  driveRootFolderId: string | null;
  ticketKey: string;
  files: File[];
}) {
  if (!params.driveRootFolderId || params.files.length === 0) {
    return { driveFolderId: null as string | null, attachments: [] as Array<Record<string, unknown>> };
  }

  const requestsFolder = await getOrCreateDriveFolderByName("Requests", params.driveRootFolderId);
  const ticketFolder = await getOrCreateDriveFolderByName(params.ticketKey, requestsFolder.id);

  const attachments: Array<Record<string, unknown>> = [];
  for (const file of params.files) {
    const uploaded = await uploadFile({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data: Buffer.from(await file.arrayBuffer()),
      parentId: ticketFolder.id,
    });
    attachments.push({
      _key: uploaded.id,
      driveFileId: uploaded.id,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      webViewLink: uploaded.webViewLink ?? null,
      webContentLink: uploaded.webContentLink ?? null,
    });
  }

  return { driveFolderId: ticketFolder.id, attachments };
}
