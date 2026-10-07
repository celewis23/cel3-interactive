import { randomUUID } from "crypto";
import { sql } from "@/lib/postgres";

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  html: string;
  createdAt: string;
  updatedAt: string;
}

export type EmailTemplateInput = {
  name: string;
  description?: string | null;
  html?: string;
};

function rowToTemplate(r: Record<string, unknown>): EmailTemplate {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    html: r.html as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM email_templates ORDER BY updated_at DESC, name ASC`
  );
  return rows.map(rowToTemplate);
}

export async function getEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `SELECT * FROM email_templates WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ? rowToTemplate(rows[0]) : null;
}

export async function createEmailTemplate(input: EmailTemplateInput): Promise<EmailTemplate> {
  const rows = await sql.query<Record<string, unknown>>(
    `INSERT INTO email_templates (id, name, description, html)
     VALUES ($1,$2,$3,$4)
     RETURNING *`,
    [randomUUID(), input.name, input.description ?? null, input.html ?? ""]
  );
  return rowToTemplate(rows[0]);
}

export async function updateEmailTemplate(
  id: string,
  input: EmailTemplateInput
): Promise<EmailTemplate | null> {
  const rows = await sql.query<Record<string, unknown>>(
    `UPDATE email_templates
     SET name = $1,
         description = $2,
         html = $3,
         updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [input.name, input.description ?? null, input.html ?? "", id]
  );
  return rows[0] ? rowToTemplate(rows[0]) : null;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await sql.query(`DELETE FROM email_templates WHERE id = $1`, [id]);
}
