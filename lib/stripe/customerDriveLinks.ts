import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

export type CustomerDriveLink = {
  _id: string;
  customerId: string;
  folderId: string;
  folderName: string;
  linkedAt: string;
};

function sanitizeFolderId(folderId: string): string {
  return folderId.replace(/[^a-zA-Z0-9]/g, "_");
}

function makeLinkId(customerId: string, folderId: string): string {
  return `stripeCustomerDrive_${customerId}_${sanitizeFolderId(folderId)}`;
}

export async function getCustomerDriveLinks(customerId: string): Promise<CustomerDriveLink[]> {
  return sanityServer.fetch<CustomerDriveLink[]>(
    '*[_type == "stripeCustomerDriveLink" && customerId == $customerId] | order(linkedAt desc)',
    { customerId }
  );
}

export async function addCustomerDriveLink(
  customerId: string,
  folderId: string,
  folderName: string
): Promise<CustomerDriveLink> {
  const _id = makeLinkId(customerId, folderId);
  const doc = {
    _id,
    _type: "stripeCustomerDriveLink",
    customerId,
    folderId,
    folderName,
    linkedAt: new Date().toISOString(),
  };
  await sanityWriteClient.createOrReplace(doc);
  return {
    _id,
    customerId,
    folderId,
    folderName,
    linkedAt: doc.linkedAt,
  };
}

export async function removeCustomerDriveLink(customerId: string, folderId: string): Promise<void> {
  const _id = makeLinkId(customerId, folderId);
  await sanityWriteClient.delete(_id);
}
