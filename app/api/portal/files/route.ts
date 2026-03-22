import { NextRequest, NextResponse } from "next/server";
import { sanityServer } from "@/lib/sanityServer";
import { verifyPortalSessionToken, PORTAL_COOKIE } from "@/lib/portal/auth";
import { listFiles, uploadFile } from "@/lib/google/drive";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch<{ driveRootFolderId: string | null } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ driveRootFolderId }`,
      { id: session.userId }
    );
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!user.driveRootFolderId) return NextResponse.json({ files: [], connected: false });

    const result = await listFiles({ folderId: user.driveRootFolderId }).catch(() => ({ files: [] }));
    return NextResponse.json({ files: result.files, connected: true });
  } catch (err) {
    console.error("PORTAL_FILES_GET_ERR:", err);
    return NextResponse.json({ files: [], connected: false });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await sanityServer.fetch<{ driveRootFolderId: string | null } | null>(
      `*[_type == "clientPortalUser" && _id == $id][0]{ driveRootFolderId }`,
      { id: session.userId }
    );
    if (!user?.driveRootFolderId) {
      return NextResponse.json({ error: "No Drive folder configured for this account" }, { status: 422 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFile({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      data: buffer,
      parentId: user.driveRootFolderId,
    });

    return NextResponse.json(uploaded, { status: 201 });
  } catch (err) {
    console.error("PORTAL_FILES_POST_ERR:", err);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
