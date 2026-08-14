import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminChart } from "@/components/admin/AdminChart";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatRupiah } from "@/lib/kursus-data";
import Link from "next/link";

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

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    totalRegistrations,
    pendingRegistrations,
    paidRegistrations,
    totalMentors,
    activeCourses,
    revenueAgg,
    registrations7d,
    recentRegistrations,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.courseRegistration.count(),
    prisma.courseRegistration.count({ where: { status: "pending" } }),
    prisma.courseRegistration.count({ where: { status: "paid" } }),
    prisma.mentor.count(),
    prisma.course.count({ where: { status: "ACTIVE" } }),
    prisma.courseRegistration.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
    prisma.courseRegistration.findMany({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.courseRegistration.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  });
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const registrationsChart = dayLabels.map((label, i) => {
    const dayStart = startOfDay(new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000));
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return {
      label,
      value: registrations7d.filter(
        (r) => r.createdAt.getTime() >= dayStart && r.createdAt.getTime() < dayEnd
      ).length,
    };
  });

  const paymentsChart = dayLabels.map((label, i) => {
    const dayStart = startOfDay(new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000));
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return {
      label,
      value: registrations7d.filter(
        (r) =>
          r.status === "paid" &&
          r.createdAt.getTime() >= dayStart &&
          r.createdAt.getTime() < dayEnd
      ).length,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ringkasan sistem Kemudi.id — {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <AdminCard label="Pengguna" value={totalUsers} sub={`+${newUsers7d} dalam 7 hari`} />
        <AdminCard label="Pendaftaran" value={totalRegistrations} sub={`${pendingRegistrations} menunggu verifikasi`} />
        <AdminCard label="Pembayaran Pending" value={pendingRegistrations} accent="text-amber-600 dark:text-amber-400" />
        <AdminCard label="Pembayaran Berhasil" value={paidRegistrations} accent="text-emerald-600 dark:text-emerald-400" />
        <AdminCard label="Mentor" value={totalMentors} />
        <AdminCard label="Kursus Aktif" value={activeCourses} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Grafik Pendaftaran (7 hari)</h2>
          <div className="mt-4">
            <AdminChart data={registrationsChart} />
          </div>
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="font-semibold text-neutral-900 dark:text-white">Grafik Pembayaran (7 hari)</h2>
          <div className="mt-4">
            <AdminChart data={paymentsChart} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-900 dark:text-white">Pendaftaran Terbaru</h2>
            <Link href="/admin/pendaftaran" className="text-sm font-medium text-emerald-600 hover:underline">
              Lihat semua →
            </Link>
          </div>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentRegistrations.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-neutral-900 dark:text-white">{r.name}</div>
                  <div className="truncate text-xs text-neutral-500">{fmtTime(r.createdAt.toISOString())}</div>
                </div>
                <div className="text-xs text-neutral-400">{formatRupiah(r.amount)}</div>
                <StatusBadge status={r.status} />
              </li>
            ))}
            {recentRegistrations.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-neutral-400">Belum ada pendaftaran.</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-900 dark:text-white">Aktivitas Admin</h2>
            <span className="text-xs text-neutral-400">audit log</span>
          </div>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentAuditLogs.map((l) => (
              <li key={l.id} className="px-5 py-3 text-sm">
                <div className="font-medium text-neutral-900 dark:text-white">
                  {ACTION_LABELS[l.action] ?? l.action}
                </div>
                <div className="text-xs text-neutral-500">
                  {l.adminEmail} · {fmtTime(l.createdAt.toISOString())}
                </div>
              </li>
            ))}
            {recentAuditLogs.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-neutral-400">Belum ada aktivitas.</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

