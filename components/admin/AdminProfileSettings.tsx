"use client";

import { useEffect, useState } from "react";

type AdminProfile = {
  name: string;
  email: string;
  profileImageUrl: string | null;
};

export default function AdminProfileSettings() {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/profile", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load profile");
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.set("file", file);
      const res = await fetch("/api/admin/profile-picture", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({})) as { error?: string; profileImageUrl?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to upload profile picture");
      setProfile((current) => current ? { ...current, profileImageUrl: data.profileImageUrl ?? null } : current);
      window.dispatchEvent(new CustomEvent("cel3-profile-image-updated", {
        detail: { profileImageUrl: data.profileImageUrl ?? null },
      }));
      setSuccess("Profile picture updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  }

  const initial = (profile?.name || profile?.email || "A").trim().slice(0, 1).toUpperCase();

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-white">Admin profile</h2>
        <p className="mt-1 text-sm text-white/45">Add a profile picture for admin messaging and workspace identity.</p>
      </div>

      {loading ? (
        <div className="h-20 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-sky-500/15 text-xl font-semibold text-white">
            {profile?.profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profileImageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{profile?.name ?? "Admin"}</p>
            <p className="truncate text-xs text-white/35">{profile?.email}</p>
          </div>
          <label className="cursor-pointer rounded-xl border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:text-white">
            {uploading ? "Uploading..." : "Upload image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="hidden"
              disabled={uploading}
              onChange={handleImageChange}
            />
          </label>
        </div>
      )}

      {error && <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
      {success && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{success}</div>}
    </div>
  );
}
