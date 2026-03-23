export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { logAudit, AuditAction } from "@/lib/audit/log";

const DEFAULT_CATEGORIES = [
  { name: "Office Supplies",         color: "#6366f1", taxRelevant: true  },
  { name: "Software & Subscriptions", color: "#8b5cf6", taxRelevant: true  },
  { name: "Travel & Transportation",  color: "#3b82f6", taxRelevant: true  },
  { name: "Meals & Entertainment",    color: "#f59e0b", taxRelevant: true  },
  { name: "Marketing & Advertising",  color: "#ec4899", taxRelevant: true  },
  { name: "Professional Services",    color: "#14b8a6", taxRelevant: true  },
  { name: "Equipment & Hardware",     color: "#f97316", taxRelevant: true  },
  { name: "Utilities",                color: "#84cc16", taxRelevant: true  },
  { name: "Rent & Facilities",        color: "#06b6d4", taxRelevant: true  },
  { name: "Insurance",                color: "#0ea5e9", taxRelevant: true  },
  { name: "Taxes & Fees",             color: "#ef4444", taxRelevant: true  },
  { name: "Training & Education",     color: "#a855f7", taxRelevant: true  },
  { name: "Salaries & Payroll",       color: "#10b981", taxRelevant: true  },
  { name: "Miscellaneous",            color: "#6b7280", taxRelevant: false },
];

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "view");
  if (authErr) return authErr;

  try {
    let cats = await sanityServer.fetch<{ _id: string; name: string; color: string; isDefault: boolean; taxRelevant: boolean }[]>(
      `*[_type == "expenseCategory"] | order(isDefault desc, name asc) { _id, name, color, isDefault, taxRelevant }`
    );

    // Seed defaults on first use
    if (cats.length === 0) {
      await Promise.all(
        DEFAULT_CATEGORIES.map((c) =>
          sanityWriteClient.create({
            _type: "expenseCategory",
            name: c.name,
            color: c.color,
            isDefault: true,
            taxRelevant: c.taxRelevant,
          })
        )
      );
      cats = await sanityServer.fetch(
        `*[_type == "expenseCategory"] | order(isDefault desc, name asc) { _id, name, color, isDefault, taxRelevant }`
      );
    }

    return NextResponse.json(cats);
  } catch (err) {
    console.error("EXPENSE_CATS_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "expenses", "edit");
  if (authErr) return authErr;

  try {
    const { name, color, taxRelevant } = await req.json() as { name: string; color?: string; taxRelevant?: boolean };
    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const cat = await sanityWriteClient.create({
      _type: "expenseCategory",
      name: name.trim(),
      color: color ?? "#6b7280",
      isDefault: false,
      taxRelevant: taxRelevant ?? false,
    });

    logAudit(req, {
      action: AuditAction.EXPENSE_CATEGORY_CREATED,
      resourceType: "expenseCategory",
      resourceId: cat._id,
      resourceLabel: name.trim(),
      description: `Created expense category: ${name.trim()}`,
    });

    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    console.error("EXPENSE_CATS_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
