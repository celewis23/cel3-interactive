export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/admin/auth";
import { sanityServer } from "@/lib/sanityServer";
import { sanityWriteClient } from "@/lib/sanity.write";
import { uploadProfileImage } from "@/lib/profileImages";
import { logAudit } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? verifySessionToken(token) : null;
  if (!session || session.step !== "full") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload" }, { status: 400 });
    }

    const uploaded = await uploadProfileImage(file);

    if (!session.staffId) {
      const existing = await sanityServer.fetch<{ _id: string } | null>(`*[_id == "siteSettings"][0]{ _id }`);
      if (existing) {
        await sanityWriteClient.patch("siteSettings").set({
          ownerProfileImageUrl: uploaded.url,
          ownerProfileImageAssetId: uploaded.assetId,
        }).commit();
      } else {
        await sanityWriteClient.createOrReplace({
          _id: "siteSettings",
          _type: "siteSettings",
          ownerProfileImageUrl: uploaded.url,
          ownerProfileImageAssetId: uploaded.assetId,
        });
      }
    } else {
      await sanityWriteClient.patch(session.staffId).set({
        profileImageUrl: uploaded.url,
        profileImageAssetId: uploaded.assetId,
      }).commit();
    }

    logAudit(req, {
      action: "admin.profile_picture_updated",
      resourceType: session.staffId ? "staffMember" : "siteSettings",
      resourceId: session.staffId ?? "siteSettings",
      description: "Admin profile picture updated",
    });

    return NextResponse.json({ profileImageUrl: uploaded.url });
  } catch (err) {
    console.error("ADMIN_PROFILE_IMAGE_ERR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to upload profile picture" },
      { status: 400 }
    );
  }
}
