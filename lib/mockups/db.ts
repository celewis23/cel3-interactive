import { randomUUID } from "crypto";
import { sql } from "@/lib/postgres";

export type MockupStatus = "staged" | "sent";

export interface Mockup {
  slug: string;
  name: string;
  status: MockupStatus;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MockupWithStats extends Mockup {
  choiceCount: number;
  lastChoiceAt: string | null;
}

export interface MockupChoice {
  id: string;
  mockupSlug: string;
  concept: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  pipelineContactId: string | null;
  createdAt: string;
}

export type MockupChoiceInput = {
  mockupSlug: string;
  concept: string;
  contactName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  notes?: string | null;
  pipelineContactId?: string | null;
};

function rowToMockup(r: Record<string, unknown>): Mockup {
  return {
    slug: r.slug as string,
    name: r.name as string,
    status: r.status as MockupStatus,
    sentAt: (r.sent_at as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function rowToChoice(r: Record<string, unknown>): MockupChoice {
  return {
    id: r.id as string,
    mockupSlug: r.mockup_slug as string,
    concept: r.concept as string,
    contactName: r.contact_name as string,
    contactEmail: (r.contact_email as string | null) ?? null,
    contactPhone: (r.contact_phone as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    pipelineContactId: (r.pipeline_contact_id as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function listMockups(): Promise<MockupWithStats[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT m.*,
       COUNT(c.id)::int AS choice_count,
       MAX(c.created_at) AS last_choice_at
     FROM mockups m
     LEFT JOIN mockup_choices c ON c.mockup_slug = m.slug
     GROUP BY m.slug
     ORDER BY m.created_at DESC`
  );
  return rows.map((r) => ({
    ...rowToMockup(r),
    choiceCount: Number(r.choice_count ?? 0),
    lastChoiceAt: (r.last_choice_at as string | null) ?? null,
  }));
}

export async function getMockupBySlug(slug: string): Promise<Mockup | null> {
  const rows = await sql.query<Record<string, unknown>>(`SELECT * FROM mockups WHERE slug = $1 LIMIT 1`, [slug]);
  return rows[0] ? rowToMockup(rows[0]) : null;
}

/** Ensures a mockup row exists for this slug, creating a "staged" entry if it doesn't. */
export async function ensureMockup(slug: string, name: string): Promise<Mockup> {
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO mockups (slug, name) VALUES ($1, $2)
     ON CONFLICT (slug) DO UPDATE SET slug = mockups.slug
     RETURNING *`,
    [slug, name]
  );
  return rowToMockup(rows[0]);
}

export async function setMockupStatus(slug: string, status: MockupStatus): Promise<Mockup | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `UPDATE mockups
     SET status = $1,
         sent_at = CASE WHEN $1 = 'sent' THEN COALESCE(sent_at, now()) ELSE NULL END,
         updated_at = now()
     WHERE slug = $2
     RETURNING *`,
    [status, slug]
  );
  return rows[0] ? rowToMockup(rows[0]) : null;
}

export async function listChoicesForMockup(slug: string): Promise<MockupChoice[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM mockup_choices WHERE mockup_slug = $1 ORDER BY created_at DESC`,
    [slug]
  );
  return rows.map(rowToChoice);
}

export async function createChoice(input: MockupChoiceInput): Promise<MockupChoice> {
  const id = randomUUID();
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO mockup_choices (
      id, mockup_slug, concept, contact_name, contact_email, contact_phone, notes, pipeline_contact_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *`,
    [
      id,
      input.mockupSlug,
      input.concept,
      input.contactName,
      input.contactEmail ?? null,
      input.contactPhone ?? null,
      input.notes ?? null,
      input.pipelineContactId ?? null,
    ]
  );
  return rowToChoice(rows[0]);
}
