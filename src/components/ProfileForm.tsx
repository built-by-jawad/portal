"use client";

import { useState } from "react";
import { createProfile, updateProfile } from "@/lib/profileActions";
import { PAGE_KEYS } from "@/lib/permissions";

type Existing = {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: { page: string; canView: boolean; canEdit: boolean }[];
};

export default function ProfileForm({ existing }: { existing?: Existing }) {
  const [role, setRole] = useState(existing?.role ?? "MEMBER");
  const [open, setOpen] = useState(!existing);

  const permByPage = new Map(existing?.permissions.map((p) => [p.page, p]));
  const action = existing ? updateProfile : createProfile;

  if (existing && !open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-green">
        Edit profile & permissions
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {existing && <input type="hidden" name="id" value={existing.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Name"
          defaultValue={existing?.name}
          required
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          defaultValue={existing?.email}
          required
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
        />
        <input
          type="password"
          name="password"
          placeholder={existing ? "New password (leave blank to keep)" : "Password"}
          required={!existing}
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-green"
        />
        <input
          type="file"
          name="image"
          accept="image/*"
          className="rounded-md border border-mist/40 bg-transparent px-3 py-2 text-xs outline-none"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate">
        <input
          type="checkbox"
          name="role"
          value="ADMIN"
          checked={role === "ADMIN"}
          onChange={(e) => setRole(e.target.checked ? "ADMIN" : "MEMBER")}
        />
        Admin (full access to every page, bypasses permissions below)
      </label>

      {role !== "ADMIN" && (
        <div className="rounded-lg border border-mist/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate">Page access</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PAGE_KEYS.map(({ key, label }) => {
              const current = permByPage.get(key);
              return (
                <div key={key} className="flex items-center justify-between gap-3 rounded-md bg-black/5 px-2 py-1.5 text-sm dark:bg-white/5">
                  <span className="text-ink">{label}</span>
                  <div className="flex gap-3 text-xs text-slate">
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name={`view_${key}`} defaultChecked={current?.canView} /> View
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" name={`edit_${key}`} defaultChecked={current?.canEdit} /> Edit
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="rounded-md bg-green px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
          {existing ? "Save changes" : "Create profile"}
        </button>
        {existing && (
          <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-mist/40 px-4 py-2 text-sm text-slate">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
