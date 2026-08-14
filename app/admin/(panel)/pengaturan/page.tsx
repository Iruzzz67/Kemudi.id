import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";

export const metadata: Metadata = {
  title: "Admin - Pengaturan | Kemudi.id",
};

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Login admin",
  "payment.confirm": "Konfirmasi pembayaran",
  "payment.reject": "Tolak pembayaran",
  "registration.reopen": "Buka kembali pendaftaran",
  "mentor.create": "Buat mentor",
  "mentor.update": "Ubah mentor",
  "mentor.delete": "Hapus mentor",
  "course.create": "Buat kursus",
  "course.update": "Ubah kursus",
  "course.delete": "Hapus kursus",
  "schedule.create": "Buat jadwal",
  "schedule.update": "Ubah jadwal",
  "schedule.delete": "Hapus jadwal",
  "user.update": "Ubah pengguna",
  "user.deactivate": "Nonaktifkan pengguna",
  "admin.change_password": "Ganti password admin",
};

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [recentLogs, adminUsers] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true, name: true, email: true, active: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Pengaturan Admin</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Profil, keamanan, dan konfigurasi sistem Kemudi.id.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {/* Profil admin */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Profil Admin</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Nama</dt>
                <dd className="font-medium text-neutral-900 dark:text-white">{admin.name || "Administrator"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Email</dt>
                <dd className="font-medium text-neutral-900 dark:text-white">{admin.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">Role</dt>
                <dd className="font-medium text-neutral-900 dark:text-white">ADMIN</dd>
              </div>
            </dl>
          </div>

          {/* Keamanan */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Keamanan — Ganti Password</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Password di-hash (bcrypt). Tidak pernah disimpan dalam bentuk plaintext.
            </p>
            <div className="mt-4">
              <ChangePasswordForm />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {/* Daftar admin */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Akun Admin</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Role admin ditentukan lewat <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">ADMIN_EMAILS</code> di .env
              (saat registrasi) atau <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">npm run set-admin -- &lt;email&gt;</code>.
            </p>
            <ul className="mt-4 space-y-2">
              {adminUsers.map((u) => (
                <li key={u.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2 text-sm dark:border-neutral-800">
                  <span className="font-medium text-neutral-900 dark:text-white">{u.name || u.email}</span>
                  <span className="text-xs text-neutral-500">{u.email}</span>
                </li>
              ))}
              {adminUsers.length === 0 && (
                <li className="text-sm text-neutral-400">Belum ada akun admin.</li>
              )}
            </ul>
            {adminEmails.length > 0 && (
              <p className="mt-3 text-xs text-neutral-500">
                ADMIN_EMAILS terdaftar: {adminEmails.join(", ")}
              </p>
            )}
          </div>

          {/* Audit log */}
          <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
              Audit Log Terbaru
            </h2>
            <ul className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
              {recentLogs.map((l) => (
                <li key={l.id} className="py-2 text-sm">
                  <span className="font-medium text-neutral-900 dark:text-white">
                    {ACTION_LABELS[l.action] ?? l.action}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {l.adminEmail} ·{" "}
                    {new Date(l.createdAt).toLocaleString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
              {recentLogs.length === 0 && (
                <li className="py-2 text-sm text-neutral-400">Belum ada aktivitas tercatat.</li>
              )}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
