import { listCustomers, updateCustomer } from "@/lib/stripe/billing";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { syncPipelineContactToGoogleContact } from "@/lib/google/contactSync";

type ContactProfile = {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  googleContactResourceName?: string | null;
  stripeCustomerId?: string | null;
};

type PipelineContactRecord = ContactProfile & {
  _id: string;
  stripeCustomerId: string | null;
  googleContactResourceName: string | null;
};

type LegacyContactRecord = {
  _id: string;
};

async function findPipelineContact(profile: {
  googleContactResourceName?: string | null;
  email?: string | null;
}) {
  if (profile.googleContactResourceName) {
    const byGoogle = await sanityServer.fetch<PipelineContactRecord | null>(
      `*[_type == "pipelineContact" && googleContactResourceName == $resourceName][0]{
        _id, name, email, phone, company, notes, stripeCustomerId, googleContactResourceName
      }`,
      { resourceName: profile.googleContactResourceName }
    );
    if (byGoogle) return byGoogle;
  }

  if (profile.email) {
    return sanityServer.fetch<PipelineContactRecord | null>(
      `*[_type == "pipelineContact" && lower(email) == lower($email)][0]{
        _id, name, email, phone, company, notes, stripeCustomerId, googleContactResourceName
      }`,
      { email: profile.email }
    );
  }

  return null;
}

async function findLegacyContact(profile: { email?: string | null; name: string }) {
  if (profile.email) {
    const byEmail = await sanityServer.fetch<LegacyContactRecord | null>(
      `*[_type == "contact" && lower(email) == lower($email)][0]{ _id }`,
      { email: profile.email }
    );
    if (byEmail) return byEmail;
  }

  return sanityServer.fetch<LegacyContactRecord | null>(
    `*[_type == "contact" && name == $name][0]{ _id }`,
    { name: profile.name }
  );
}

async function syncLegacyContact(profile: ContactProfile) {
  const legacy = await findLegacyContact(profile);
  if (!legacy) return null;

  await sanityWriteClient.patch(legacy._id).set({
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    company: profile.company,
    notes: profile.notes,
  }).commit();

  return legacy._id;
}

async function syncStripeCustomer(profile: ContactProfile, pipelineContact?: PipelineContactRecord | null) {
  const stripeCustomerId = pipelineContact?.stripeCustomerId ?? profile.stripeCustomerId ?? null;
  if (stripeCustomerId) {
    return updateCustomer(stripeCustomerId, {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      description: profile.company,
    });
  }

  if (!profile.email) return null;

  const { customers } = await listCustomers({ email: profile.email, limit: 1 });
  if (customers.length === 0) return null;

  return updateCustomer(customers[0].id, {
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    description: profile.company,
  });
}

export async function syncContactProfileFromGoogle(profile: ContactProfile) {
  const pipelineContact = await findPipelineContact(profile);

  if (pipelineContact) {
    await sanityWriteClient.patch(pipelineContact._id).set({
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      company: profile.company,
      notes: profile.notes,
      ...(profile.googleContactResourceName ? { googleContactResourceName: profile.googleContactResourceName } : {}),
    }).commit();
  }

  await Promise.all([
    syncLegacyContact(profile),
    syncStripeCustomer(profile, pipelineContact),
  ]);

  return { pipelineContactId: pipelineContact?._id ?? null };
}

export async function syncContactProfileFromPipeline(pipelineContactId: string) {
  const pipelineContact = await sanityServer.fetch<PipelineContactRecord | null>(
    `*[_type == "pipelineContact" && _id == $id][0]{
      _id, name, email, phone, company, notes, stripeCustomerId, googleContactResourceName
    }`,
    { id: pipelineContactId }
  );

  if (!pipelineContact) {
    throw new Error("Pipeline contact not found");
  }

  const googleContact = await syncPipelineContactToGoogleContact({ pipelineContactId });

  const profile: ContactProfile = {
    name: pipelineContact.name,
    email: pipelineContact.email,
    phone: pipelineContact.phone,
    company: pipelineContact.company,
    notes: pipelineContact.notes,
    googleContactResourceName: googleContact.resourceName,
    stripeCustomerId: pipelineContact.stripeCustomerId,
  };

  await Promise.all([
    sanityWriteClient.patch(pipelineContactId).set({
      googleContactResourceName: googleContact.resourceName,
    }).commit(),
    syncLegacyContact(profile),
    syncStripeCustomer(profile, pipelineContact),
  ]);

  return { googleContactResourceName: googleContact.resourceName };
}
