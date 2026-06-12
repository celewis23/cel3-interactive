export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getSessionInfo } from "@/lib/admin/permissions";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";

type SessionScope = {
  isOwner: boolean;
  staffId: string | null;
  ownerFilter: string;
  params: Record<string, string>;
  ownerKey: string;
};

type AdminNoteDoc = {
  _id: string;
  title?: string;
  content?: string | null;
  canvasData?: string | null;
  blocksJson?: string | null;
  color?: string | null;
  isPinned?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;
  workspaceId?: string | null;
  sectionId?: string | null;
  parentPageId?: string | null;
  order?: number | null;
  tags?: string[];
  metadataJson?: string | null;
  linkedRecords?: Array<{ type: string; id: string; label?: string }>;
  staffId?: string | null;
  _createdAt: string;
  _updatedAt: string;
};

function scopeFromRequest(req: NextRequest): SessionScope {
  const session = getSessionInfo(req);
  const isOwner = Boolean(session?.isOwner);
  const staffId = session?.staffId ?? null;
  return {
    isOwner,
    staffId,
    ownerFilter: isOwner ? "staffId == null" : "staffId == $staffId",
    params: staffId ? { staffId } : {},
    ownerKey: isOwner ? "owner" : `staff-${staffId}`,
  };
}

function safeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function defaultWorkspaceId(scope: SessionScope) {
  return `noteWorkspace.${safeIdPart(scope.ownerKey)}.default`;
}

function defaultSectionId(scope: SessionScope) {
  return `noteSection.${safeIdPart(scope.ownerKey)}.legacy`;
}

function ownerFields(scope: SessionScope) {
  return { staffId: scope.isOwner ? null : scope.staffId };
}

async function ensureDefaultHierarchy(scope: SessionScope) {
  const workspaceId = defaultWorkspaceId(scope);
  const sectionId = defaultSectionId(scope);

  await sanityWriteClient.createIfNotExists({
    _id: workspaceId,
    _type: "noteWorkspace",
    title: "CEL3 Workspace",
    order: 0,
    isArchived: false,
    isFavorite: false,
    ...ownerFields(scope),
  });

  await sanityWriteClient.createIfNotExists({
    _id: sectionId,
    _type: "noteSection",
    workspaceId,
    title: "Legacy Notes",
    order: 0,
    color: "#38bdf8",
    isArchived: false,
    ...ownerFields(scope),
  });

  return { workspaceId, sectionId };
}

function pageForResponse(note: AdminNoteDoc, defaults: { workspaceId: string; sectionId: string }) {
  return {
    ...note,
    title: note.title || "Untitled Note",
    workspaceId: note.workspaceId || defaults.workspaceId,
    sectionId: note.sectionId || defaults.sectionId,
    parentPageId: note.parentPageId ?? null,
    order: typeof note.order === "number" ? note.order : 0,
    isPinned: Boolean(note.isPinned),
    isFavorite: Boolean(note.isFavorite),
    isArchived: Boolean(note.isArchived),
    tags: note.tags ?? [],
    linkedRecords: note.linkedRecords ?? [],
  };
}

async function verifyOwnedDoc(id: string, type: string, scope: SessionScope) {
  return sanityServer.fetch<{ _id: string } | null>(
    `*[_type == $type && _id == $id && ${scope.ownerFilter}][0]{ _id }`,
    { ...scope.params, id, type }
  );
}

export async function GET(req: NextRequest) {
  const authErr = await requirePermission(req, "notes", "view");
  if (authErr) return authErr;

  try {
    const scope = scopeFromRequest(req);
    const defaults = await ensureDefaultHierarchy(scope);

    const [workspaces, sections, notes, linkOptions] = await Promise.all([
      sanityServer.fetch(
        `*[_type == "noteWorkspace" && ${scope.ownerFilter} && isArchived != true] | order(order asc, _createdAt asc) {
          _id, title, order, isFavorite, _createdAt, _updatedAt
        }`,
        scope.params
      ),
      sanityServer.fetch(
        `*[_type == "noteSection" && ${scope.ownerFilter} && isArchived != true] | order(order asc, _createdAt asc) {
          _id, title, workspaceId, order, color, _createdAt, _updatedAt
        }`,
        scope.params
      ),
      sanityServer.fetch<AdminNoteDoc[]>(
        `*[_type == "adminNote" && ${scope.ownerFilter}] | order(isPinned desc, order asc, _updatedAt desc) {
          _id, title, content, canvasData, blocksJson, color, isPinned, isFavorite, isArchived,
          workspaceId, sectionId, parentPageId, order, tags, metadataJson, linkedRecords,
          staffId, _createdAt, _updatedAt
        }`,
        scope.params
      ),
      Promise.all([
        sanityServer.fetch(
          `*[_type == "pipelineContact"] | order(coalesce(company, name, email) asc)[0...80]{
            _id, "label": coalesce(company, name, email), email
          }`
        ),
        sanityServer.fetch(
          `*[_type == "clientPortalUser" && status != "suspended"] | order(coalesce(company, name, email) asc)[0...80]{
            _id, "label": coalesce(company, name, email), email
          }`
        ),
        sanityServer.fetch(
          `*[_type == "pmProject"] | order(_updatedAt desc)[0...80]{ _id, "label": name, status }`
        ),
        sanityServer.fetch(
          `*[_type == "pmTask"] | order(_updatedAt desc)[0...80]{ _id, "label": title, projectId }`
        ),
        sanityServer.fetch(
          `*[_type == "clientPortalTicket"] | order(updatedAt desc)[0...80]{ _id, "label": title, status }`
        ),
        sanityServer.fetch(
          `*[_type == "invoice"] | order(_updatedAt desc)[0...80]{ _id, "label": coalesce(number, _id), status }`
        ),
      ]),
    ]);

    return NextResponse.json({
      workspaces,
      sections,
      pages: notes.map((note) => pageForResponse(note, defaults)),
      defaults,
      aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
      linkOptions: {
        clients: [...linkOptions[0], ...linkOptions[1]],
        projects: linkOptions[2],
        tasks: linkOptions[3],
        tickets: linkOptions[4],
        invoices: linkOptions[5],
      },
    });
  } catch (err) {
    console.error("NOTES_GET_ERR:", err);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

async function duplicatePage(pageId: string, scope: SessionScope) {
  const page = await sanityServer.fetch<AdminNoteDoc | null>(
    `*[_type == "adminNote" && _id == $id && ${scope.ownerFilter}][0]`,
    { ...scope.params, id: pageId }
  );
  if (!page) return null;

  return sanityWriteClient.create({
    _type: "adminNote",
    title: `${page.title || "Untitled Note"} Copy`,
    content: page.content ?? null,
    canvasData: page.canvasData ?? null,
    blocksJson: page.blocksJson ?? null,
    color: page.color ?? null,
    isPinned: false,
    isFavorite: false,
    isArchived: false,
    workspaceId: page.workspaceId ?? null,
    sectionId: page.sectionId ?? null,
    parentPageId: page.parentPageId ?? null,
    order: Date.now(),
    tags: page.tags ?? [],
    metadataJson: page.metadataJson ?? null,
    linkedRecords: page.linkedRecords ?? [],
    ...ownerFields(scope),
  });
}

async function duplicateSection(sectionId: string, scope: SessionScope, workspaceId?: string) {
  const section = await sanityServer.fetch<Record<string, unknown> | null>(
    `*[_type == "noteSection" && _id == $id && ${scope.ownerFilter}][0]`,
    { ...scope.params, id: sectionId }
  );
  if (!section) return null;

  const created = await sanityWriteClient.create({
    _type: "noteSection",
    title: `${String(section.title || "Section")} Copy`,
    workspaceId: workspaceId ?? section.workspaceId,
    order: Date.now(),
    color: section.color ?? "#38bdf8",
    isArchived: false,
    ...ownerFields(scope),
  });

  const pages = await sanityServer.fetch<AdminNoteDoc[]>(
    `*[_type == "adminNote" && sectionId == $sectionId && ${scope.ownerFilter} && isArchived != true]`,
    { ...scope.params, sectionId }
  );
  for (const page of pages) {
    await sanityWriteClient.create({
      _type: "adminNote",
      title: page.title,
      content: page.content ?? null,
      canvasData: page.canvasData ?? null,
      blocksJson: page.blocksJson ?? null,
      color: page.color ?? null,
      isPinned: false,
      isFavorite: false,
      isArchived: false,
      workspaceId: created.workspaceId,
      sectionId: created._id,
      parentPageId: page.parentPageId ?? null,
      order: page.order ?? Date.now(),
      tags: page.tags ?? [],
      metadataJson: page.metadataJson ?? null,
      linkedRecords: page.linkedRecords ?? [],
      ...ownerFields(scope),
    });
  }
  return created;
}

async function duplicateWorkspace(workspaceId: string, scope: SessionScope) {
  const workspace = await sanityServer.fetch<Record<string, unknown> | null>(
    `*[_type == "noteWorkspace" && _id == $id && ${scope.ownerFilter}][0]`,
    { ...scope.params, id: workspaceId }
  );
  if (!workspace) return null;

  const created = await sanityWriteClient.create({
    _type: "noteWorkspace",
    title: `${String(workspace.title || "Workspace")} Copy`,
    order: Date.now(),
    isArchived: false,
    isFavorite: false,
    ...ownerFields(scope),
  });

  const sections = await sanityServer.fetch<Array<{ _id: string }>>(
    `*[_type == "noteSection" && workspaceId == $workspaceId && ${scope.ownerFilter} && isArchived != true]{ _id }`,
    { ...scope.params, workspaceId }
  );
  for (const section of sections) {
    await duplicateSection(section._id, scope, created._id);
  }
  return created;
}

export async function POST(req: NextRequest) {
  const authErr = await requirePermission(req, "notes", "edit");
  if (authErr) return authErr;

  try {
    const scope = scopeFromRequest(req);
    const defaults = await ensureDefaultHierarchy(scope);
    const body = await req.json() as {
      action?: "workspace" | "section" | "page" | "duplicateWorkspace" | "duplicateSection" | "duplicatePage";
      workspaceId?: string;
      sectionId?: string;
      pageId?: string;
      parentPageId?: string | null;
      title?: string;
      content?: string;
      canvasData?: string;
      blocksJson?: string;
      color?: string;
      isPinned?: boolean;
      tags?: string[];
      metadataJson?: string;
      linkedRecords?: Array<{ type: string; id: string; label?: string }>;
    };

    if (body.action === "workspace") {
      const workspace = await sanityWriteClient.create({
        _type: "noteWorkspace",
        title: body.title?.trim() || "New Workspace",
        order: Date.now(),
        isArchived: false,
        isFavorite: false,
        ...ownerFields(scope),
      });
      return NextResponse.json(workspace, { status: 201 });
    }

    if (body.action === "section") {
      const workspaceId = body.workspaceId || defaults.workspaceId;
      const workspace = await verifyOwnedDoc(workspaceId, "noteWorkspace", scope);
      if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

      const section = await sanityWriteClient.create({
        _type: "noteSection",
        title: body.title?.trim() || "New Section",
        workspaceId,
        order: Date.now(),
        color: body.color ?? "#38bdf8",
        isArchived: false,
        ...ownerFields(scope),
      });
      return NextResponse.json(section, { status: 201 });
    }

    if (body.action === "duplicateWorkspace" && body.workspaceId) {
      const copy = await duplicateWorkspace(body.workspaceId, scope);
      if (!copy) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
      return NextResponse.json(copy, { status: 201 });
    }

    if (body.action === "duplicateSection" && body.sectionId) {
      const copy = await duplicateSection(body.sectionId, scope);
      if (!copy) return NextResponse.json({ error: "Section not found" }, { status: 404 });
      return NextResponse.json(copy, { status: 201 });
    }

    if (body.action === "duplicatePage" && (body.pageId || body.sectionId)) {
      const copy = await duplicatePage(body.pageId || body.sectionId || "", scope);
      if (!copy) return NextResponse.json({ error: "Page not found" }, { status: 404 });
      return NextResponse.json(copy, { status: 201 });
    }

    const workspaceId = body.workspaceId || defaults.workspaceId;
    const sectionId = body.sectionId || defaults.sectionId;
    const [workspace, section] = await Promise.all([
      verifyOwnedDoc(workspaceId, "noteWorkspace", scope),
      verifyOwnedDoc(sectionId, "noteSection", scope),
    ]);
    if (!workspace || !section) return NextResponse.json({ error: "Workspace or section not found" }, { status: 404 });

    const note = await sanityWriteClient.create({
      _type: "adminNote",
      title: body.title?.trim() || "Untitled Note",
      content: body.content ?? null,
      canvasData: body.canvasData ?? null,
      blocksJson: body.blocksJson ?? null,
      color: body.color ?? null,
      isPinned: body.isPinned ?? false,
      isFavorite: false,
      isArchived: false,
      workspaceId,
      sectionId,
      parentPageId: body.parentPageId ?? null,
      order: Date.now(),
      tags: body.tags ?? [],
      metadataJson: body.metadataJson ?? null,
      linkedRecords: body.linkedRecords ?? [],
      ...ownerFields(scope),
    });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    console.error("NOTES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}
