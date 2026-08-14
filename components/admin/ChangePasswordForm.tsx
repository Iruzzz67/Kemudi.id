"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/admin/AdminForm";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ ok: false, text: "Password baru minimal 8 karakter." });
      return;
    }
    if (newPassword !== confirm) {
      setMessage({ ok: false, text: "Konfirmasi password tidak cocok." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Gagal mengganti password.");
      setMessage({ ok: true, text: "Password berhasil diganti." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Terjadi kesalahan." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Password Saat Ini">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Password Baru">
        <input
          type="password"
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Konfirmasi Password Baru">
        <input
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </Field>

      {message && (
        <p className={`rounded-lg px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {busy ? "Menyimpan..." : "Ganti Password"}
      </button>
    </form>
  );
}
