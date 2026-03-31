import { getContact, createContact, searchContacts, updateContact, type Contact } from "@/lib/google/contacts";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type PipelineContactRecord = {
  _id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  googleContactResourceName: string | null;
  addressLine1?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
};

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    givenName: parts[0] ?? name.trim() ?? "Client",
    familyName: parts.slice(1).join(" ") || undefined,
  };
}

async function findExistingGoogleContact(contact: {
  name: string;
  email: string | null;
  googleContactResourceName?: string | null;
}) {
  if (contact.googleContactResourceName) {
    const existing = await getContact(contact.googleContactResourceName).catch(() => null);
    if (existing) return existing;
  }

  if (contact.email) {
    const emailMatches = await searchContacts(contact.email).catch(() => []);
    const exactEmailMatch =
      emailMatches.find((entry) =>
        entry.emails.some((email) => email.value.toLowerCase() === contact.email?.toLowerCase())
      ) ?? null;
    if (exactEmailMatch) return exactEmailMatch;
  }

  const nameMatches = await searchContacts(contact.name).catch(() => []);
  return (
    nameMatches.find(
      (entry) => entry.displayName?.trim().toLowerCase() === contact.name.trim().toLowerCase()
    ) ?? null
  );
}

export async function syncPipelineContactToGoogleContact(
  input:
    | {
        pipelineContactId: string;
      }
    | {
        name: string;
        email?: string | null;
        phone?: string | null;
        company?: string | null;
        notes?: string | null;
        googleContactResourceName?: string | null;
        addressLine1?: string | null;
        addressCity?: string | null;
        addressState?: string | null;
        addressPostalCode?: string | null;
        addressCountry?: string | null;
      }
) {
  const pipelineContactId = "pipelineContactId" in input ? input.pipelineContactId : null;
  const pipelineContact = pipelineContactId
    ? await sanityServer.fetch<PipelineContactRecord | null>(
        `*[_type == "pipelineContact" && _id == $id][0]{
          _id, name, email, phone, company, notes, googleContactResourceName
        }`,
        { id: pipelineContactId }
      )
    : null;

  const source: PipelineContactRecord | {
    _id: null;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    notes: string | null;
    googleContactResourceName: string | null;
    addressLine1?: string | null;
    addressCity?: string | null;
    addressState?: string | null;
    addressPostalCode?: string | null;
    addressCountry?: string | null;
  } = pipelineContact ?? (
    "pipelineContactId" in input
      ? {
          _id: null,
          name: "",
          email: null,
          phone: null,
          company: null,
          notes: null,
          googleContactResourceName: null,
          addressLine1: null,
          addressCity: null,
          addressState: null,
          addressPostalCode: null,
          addressCountry: null,
        }
      : {
          _id: null,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          company: input.company ?? null,
          notes: input.notes ?? null,
          googleContactResourceName: input.googleContactResourceName ?? null,
          addressLine1: input.addressLine1 ?? null,
          addressCity: input.addressCity ?? null,
          addressState: input.addressState ?? null,
          addressPostalCode: input.addressPostalCode ?? null,
          addressCountry: input.addressCountry ?? null,
        }
  );

  if (!source?.name?.trim()) {
    throw new Error("Contact name is required for Google sync");
  }

  const { givenName, familyName } = splitName(source.name);
  const existing = await findExistingGoogleContact(source);

  let googleContact: Contact;
  if (existing?.etag) {
    googleContact = await updateContact(existing.resourceName, existing.etag, {
      givenName,
      familyName,
      emails: source.email ? [{ value: source.email }] : [],
      phones: source.phone ? [{ value: source.phone }] : [],
      addresses: source.addressLine1 || source.addressCity || source.addressState || source.addressPostalCode || source.addressCountry
        ? [{
            streetAddress: source.addressLine1 ?? "",
            city: source.addressCity ?? "",
            region: source.addressState ?? "",
            postalCode: source.addressPostalCode ?? "",
            country: source.addressCountry ?? "",
            formattedValue: [
              source.addressLine1,
              [source.addressCity, source.addressState, source.addressPostalCode].filter(Boolean).join(" ").trim(),
              source.addressCountry,
            ].filter(Boolean).join(", "),
          }]
        : [],
      notes: source.notes ?? undefined,
      organization: source.company ?? undefined,
    });
  } else if (existing) {
    googleContact = existing;
  } else {
    googleContact = await createContact({
      givenName,
      familyName,
      emails: source.email ? [source.email] : undefined,
      phones: source.phone ? [source.phone] : undefined,
      organization: source.company ?? undefined,
      notes: source.notes ?? undefined,
      addressLine1: source.addressLine1 ?? undefined,
      city: source.addressCity ?? undefined,
      state: source.addressState ?? undefined,
      postalCode: source.addressPostalCode ?? undefined,
      country: source.addressCountry ?? undefined,
    });
  }

  if (pipelineContact?._id) {
    await sanityWriteClient
      .patch(pipelineContact._id)
      .set({ googleContactResourceName: googleContact.resourceName })
      .commit();
  }

  return googleContact;
}
