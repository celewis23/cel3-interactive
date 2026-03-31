import { getAuthenticatedClient } from "@/lib/gmail/client";

export type Contact = {
  resourceName: string;
  etag?: string | null;
  displayName: string | null;
  givenName: string | null;
  familyName: string | null;
  emails: { value: string; type?: string }[];
  phones: { value: string; type?: string }[];
  organizations: { name?: string; title?: string }[];
  addresses: { formattedValue?: string; city?: string; country?: string }[];
  notes: string | null;
  photoUrl: string | null;
  birthday: string | null; // YYYY-MM-DD
};

const PEOPLE_BASE = "https://people.googleapis.com/v1";
const PERSON_FIELDS = "names,emailAddresses,phoneNumbers,organizations,addresses,biographies,photos,birthdays";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapContact(person: Record<string, any>): Contact {
  const names = person.names ?? [];
  const emails = person.emailAddresses ?? [];
  const phones = person.phoneNumbers ?? [];
  const orgs = person.organizations ?? [];
  const addrs = person.addresses ?? [];
  const bios = person.biographies ?? [];
  const photos = person.photos ?? [];
  const birthdays = person.birthdays ?? [];

  let birthday: string | null = null;
  if (birthdays[0]?.date) {
    const d = birthdays[0].date;
    const y = d.year ? String(d.year).padStart(4, "0") : "0000";
    const mo = d.month ? String(d.month).padStart(2, "0") : "00";
    const da = d.day ? String(d.day).padStart(2, "0") : "00";
    birthday = `${y}-${mo}-${da}`;
  }

  return {
    resourceName: person.resourceName ?? "",
    etag: person.etag ?? null,
    displayName: names[0]?.displayName ?? null,
    givenName: names[0]?.givenName ?? null,
    familyName: names[0]?.familyName ?? null,
    emails: emails.map((e: Record<string, string>) => ({ value: e.value, type: e.type })),
    phones: phones.map((p: Record<string, string>) => ({ value: p.value, type: p.type })),
    organizations: orgs.map((o: Record<string, string>) => ({ name: o.name, title: o.title })),
    addresses: addrs.map((a: Record<string, string>) => ({
      formattedValue: a.formattedValue,
      city: a.city,
      country: a.country,
    })),
    notes: bios[0]?.value ?? null,
    photoUrl: photos[0]?.url ?? null,
    birthday,
  };
}

async function getAccessToken(): Promise<string> {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Not authenticated with Google");
  const tokenInfo = await auth.oauth2Client.getAccessToken();
  if (!tokenInfo.token) throw new Error("No access token");
  return tokenInfo.token;
}

export async function listContacts(opts?: {
  pageToken?: string;
  pageSize?: number;
}): Promise<{ contacts: Contact[]; nextPageToken?: string; totalItems: number }> {
  const token = await getAccessToken();
  const pageSize = opts?.pageSize ?? 100;
  const params = new URLSearchParams({
    personFields: PERSON_FIELDS,
    pageSize: String(pageSize),
  });
  if (opts?.pageToken) params.set("pageToken", opts.pageToken);

  const res = await fetch(
    `${PEOPLE_BASE}/people/me/connections?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`People API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const connections = data.connections ?? [];
  return {
    contacts: connections.map(mapContact),
    nextPageToken: data.nextPageToken ?? undefined,
    totalItems: data.totalItems ?? connections.length,
  };
}

export async function getContact(resourceName: string): Promise<Contact | null> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ personFields: PERSON_FIELDS });
  const res = await fetch(
    `${PEOPLE_BASE}/${resourceName}?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`People API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return mapContact(data);
}

export async function createContact(params: {
  givenName?: string;
  familyName?: string;
  emails?: string[];
  phones?: string[];
  organization?: string;
  notes?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}): Promise<Contact> {
  const token = await getAccessToken();

  const body: Record<string, unknown> = {};
  if (params.givenName || params.familyName) {
    body.names = [{ givenName: params.givenName ?? "", familyName: params.familyName ?? "" }];
  }
  if (params.emails?.length) {
    body.emailAddresses = params.emails.map((v) => ({ value: v }));
  }
  if (params.phones?.length) {
    body.phoneNumbers = params.phones.map((v) => ({ value: v }));
  }
  if (params.organization) {
    body.organizations = [{ name: params.organization }];
  }
  if (params.addressLine1 || params.city || params.state || params.postalCode || params.country) {
    body.addresses = [{
      streetAddress: params.addressLine1 ?? "",
      city: params.city ?? "",
      region: params.state ?? "",
      postalCode: params.postalCode ?? "",
      country: params.country ?? "",
      formattedValue: [
        params.addressLine1,
        [params.city, params.state, params.postalCode].filter(Boolean).join(" ").trim(),
        params.country,
      ].filter(Boolean).join(", "),
    }];
  }
  if (params.notes) {
    body.biographies = [{ value: params.notes, contentType: "TEXT_PLAIN" }];
  }

  const res = await fetch(`${PEOPLE_BASE}/people:createContact`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`People API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return mapContact(data);
}

export async function updateContact(
  resourceName: string,
  etag: string,
  params: {
    givenName?: string;
    familyName?: string;
    emails?: { value: string; type?: string }[];
    phones?: { value: string; type?: string }[];
    organization?: string;
    notes?: string;
    addresses?: Array<{
      streetAddress?: string;
      city?: string;
      region?: string;
      postalCode?: string;
      country?: string;
      formattedValue?: string;
    }>;
  }
): Promise<Contact> {
  const token = await getAccessToken();

  const updatePersonFields: string[] = [];
  const body: Record<string, unknown> = { etag, resourceName };

  if (params.givenName !== undefined || params.familyName !== undefined) {
    updatePersonFields.push("names");
    body.names = [{ givenName: params.givenName ?? "", familyName: params.familyName ?? "" }];
  }
  if (params.emails !== undefined) {
    updatePersonFields.push("emailAddresses");
    body.emailAddresses = params.emails;
  }
  if (params.phones !== undefined) {
    updatePersonFields.push("phoneNumbers");
    body.phoneNumbers = params.phones;
  }
  if (params.organization !== undefined) {
    updatePersonFields.push("organizations");
    body.organizations = params.organization ? [{ name: params.organization }] : [];
  }
  if (params.addresses !== undefined) {
    updatePersonFields.push("addresses");
    body.addresses = params.addresses;
  }
  if (params.notes !== undefined) {
    updatePersonFields.push("biographies");
    body.biographies = [{ value: params.notes, contentType: "TEXT_PLAIN" }];
  }

  const queryParams = new URLSearchParams({
    updatePersonFields: updatePersonFields.join(",") || "names",
  });

  const res = await fetch(
    `${PEOPLE_BASE}/${resourceName}:updateContact?${queryParams.toString()}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`People API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return mapContact(data);
}

export async function deleteContact(resourceName: string): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(`${PEOPLE_BASE}/${resourceName}:deleteContact`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`People API error: ${res.status} ${text}`);
  }
}

export async function searchContacts(query: string): Promise<Contact[]> {
  const token = await getAccessToken();
  const params = new URLSearchParams({
    query,
    readMask: "names,emailAddresses,phoneNumbers,organizations",
  });
  const res = await fetch(
    `${PEOPLE_BASE}/people:searchContacts?${params.toString()}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`People API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  const results = data.results ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return results.map((r: any) => mapContact(r.person ?? r));
}
