export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { PORTAL_COOKIE, verifyPortalSessionToken } from "@/lib/portal/auth";
import { sanityWriteClient } from "@/lib/sanity.write";
import { uploadProfileImage } from "@/lib/profileImages";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(PORTAL_COOKIE)?.value;
  const session = token ? verifyPortalSessionToken(token) : null;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
    }

    const uploaded = await uploadProfileImage(file);
    await sanityWriteClient.patch(session.userId).set({
      profileImageUrl: uploaded.url,
      profileImageAssetId: uploaded.assetId,
    }).commit();

    return NextResponse.json({ profileImageUrl: uploaded.url });
  } catch (err) {
    console.error("PORTAL_PROFILE_IMAGE_ERR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload profile picture" },
      { status: 400 }
    );
  }
}
