import { getCustomer, updateCustomer } from "@/lib/stripe/billing";
import { syncPipelineContactToGoogleContact } from "@/lib/google/contactSync";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type PortalUserRecord = {
  _id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  driveRootFolderId: string | null;
  status: string;
  mustChangePassword?: boolean | null;
};

type PipelineContactRecord = {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  stripeCustomerId: string | null;
  googleContactResourceName: string | null;
};

type LegacyContactRecord = {
  _id: string;
};

export type PortalProfile = {
  _id: string;
  displayName: string;
  company: string | null;
  email: string;
  phone: string | null;
  addressLine1: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  stripeCustomerId: string | null;
  pipelineContactId: string | null;
  googleContactResourceName: string | null;
};

export type PortalProfileUpdate = {
  displayName: string;
  email: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
};

async function getPortalUserById(userId: string) {
  return sanityServer.fetch<PortalUserRecord | null>(
    `*[_type == "clientPortalUser" && _id == $id && status != "suspended"][0]{
      _id, email, name, company, phone, addressLine1, addressCity, addressState, addressPostalCode, addressCountry,
      stripeCustomerId, pipelineContactId, driveRootFolderId, status, mustChangePassword
    }`,
    { id: userId }
  );
}

async function getPipelineContactById(pipelineContactId: string | null) {
  if (!pipelineContactId) return null;
  return sanityServer.fetch<PipelineContactRecord | null>(
    `*[_type == "pipelineContact" && _id == $id][0]{
      _id, name, email, phone, company, notes, stripeCustomerId, googleContactResourceName
    }`,
    { id: pipelineContactId }
  );
}

async function findLegacyContactByEmailOrName(email: string, name: string) {
  const byEmail = await sanityServer.fetch<LegacyContactRecord | null>(
    `*[_type == "contact" && lower(email) == lower($email)][0]{ _id }`,
    { email }
  );
  if (byEmail) return byEmail;

  return sanityServer.fetch<LegacyContactRecord | null>(
    `*[_type == "contact" && name == $name][0]{ _id }`,
    { name }
  );
}

function preferString(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function getPortalProfile(userId: string): Promise<PortalProfile | null> {
  const portalUser = await getPortalUserById(userId);
  if (!portalUser) return null;

  const [pipelineContact, stripeCustomer] = await Promise.all([
    getPipelineContactById(portalUser.pipelineContactId),
    portalUser.stripeCustomerId ? getCustomer(portalUser.stripeCustomerId).catch(() => null) : Promise.resolve(null),
  ]);

  return {
    _id: portalUser._id,
    displayName: preferString(portalUser.name, pipelineContact?.name, stripeCustomer?.name, portalUser.email) ?? portalUser.email,
    company: preferString(portalUser.company, pipelineContact?.company, stripeCustomer?.description),
    email: preferString(portalUser.email, pipelineContact?.email, stripeCustomer?.email) ?? portalUser.email,
    phone: preferString(portalUser.phone, pipelineContact?.phone, stripeCustomer?.phone),
    addressLine1: preferString(portalUser.addressLine1, stripeCustomer?.addressLine1),
    addressCity: preferString(portalUser.addressCity, stripeCustomer?.addressCity),
    addressState: preferString(portalUser.addressState, stripeCustomer?.addressState),
    addressPostalCode: preferString(portalUser.addressPostalCode, stripeCustomer?.addressPostalCode),
    addressCountry: preferString(portalUser.addressCountry, stripeCustomer?.country),
    stripeCustomerId: portalUser.stripeCustomerId,
    pipelineContactId: portalUser.pipelineContactId,
    googleContactResourceName: pipelineContact?.googleContactResourceName ?? null,
  };
}

export async function updatePortalProfile(userId: string, input: PortalProfileUpdate): Promise<PortalProfile> {
  const portalUser = await getPortalUserById(userId);
  if (!portalUser) throw new Error("Portal user not found");

  const pipelineContact = await getPipelineContactById(portalUser.pipelineContactId);
  const company = pipelineContact?.company ?? portalUser.company ?? null;

  const normalized = {
    displayName: input.displayName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    addressLine1: input.addressLine1?.trim() || null,
    addressCity: input.addressCity?.trim() || null,
    addressState: input.addressState?.trim() || null,
    addressPostalCode: input.addressPostalCode?.trim() || null,
    addressCountry: input.addressCountry?.trim() || null,
  };

  if (!normalized.displayName) throw new Error("Display name is required");
  if (!normalized.email) throw new Error("Email address is required");

  await sanityWriteClient.patch(portalUser._id).set({
    name: normalized.displayName,
    email: normalized.email,
    phone: normalized.phone,
    addressLine1: normalized.addressLine1,
    addressCity: normalized.addressCity,
    addressState: normalized.addressState,
    addressPostalCode: normalized.addressPostalCode,
    addressCountry: normalized.addressCountry,
  }).commit();

  if (pipelineContact?._id) {
    await sanityWriteClient.patch(pipelineContact._id).set({
      name: normalized.displayName,
      email: normalized.email,
      phone: normalized.phone,
      company,
    }).commit();
  }

  const legacy = await findLegacyContactByEmailOrName(portalUser.email, portalUser.name ?? normalized.displayName);
  if (legacy) {
    await sanityWriteClient.patch(legacy._id).set({
      name: normalized.displayName,
      email: normalized.email,
      phone: normalized.phone,
      company,
    }).commit();
  }

  await syncPipelineContactToGoogleContact({
    name: normalized.displayName,
    email: normalized.email,
    phone: normalized.phone,
    company,
    googleContactResourceName: pipelineContact?.googleContactResourceName ?? null,
    addressLine1: normalized.addressLine1,
    addressCity: normalized.addressCity,
    addressState: normalized.addressState,
    addressPostalCode: normalized.addressPostalCode,
    addressCountry: normalized.addressCountry,
  }).catch(() => null);

  if (portalUser.stripeCustomerId) {
    await updateCustomer(portalUser.stripeCustomerId, {
      name: normalized.displayName,
      email: normalized.email,
      phone: normalized.phone,
      description: company,
      addressLine1: normalized.addressLine1,
      addressCity: normalized.addressCity,
      addressState: normalized.addressState,
      addressPostalCode: normalized.addressPostalCode,
      addressCountry: normalized.addressCountry,
    });
  }

  const profile = await getPortalProfile(userId);
  if (!profile) throw new Error("Failed to load updated profile");
  return profile;
}
