import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminCard } from "@/components/admin/AdminCard";
import { AdminChart } from "@/components/admin/AdminChart";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { MENTORS } from "@/lib/kursus-data";

export const metadata: Metadata = {
  title: "Admin - Statistik | Kemudi.id",
};

const VEHICLE_LABELS: Record<string, string> = { MOTOR: "Motor", MOBIL: "Mobil", TRUK: "Truk" };

export default async function AdminStatistikPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalUsers, newUsersMonth, usersWithAttempts, totalTransactions, revenue, pendingPayments, paidPayments, rejectedPayments, attemptsByVehicle, regsByMentor, regsToday, regsWeek, regsMonth] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count({ where: { attempts: { some: {} } } }),
      prisma.courseRegistration.count(),
      prisma.courseRegistration.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
      prisma.courseRegistration.count({ where: { status: "pending" } }),
      prisma.courseRegistration.count({ where: { status: "paid" } }),
      prisma.courseRegistration.count({ where: { status: "rejected" } }),
      prisma.simulationAttempt.groupBy({ by: ["vehicleType"], _count: { _all: true } }),
      prisma.courseRegistration.groupBy({ by: ["mentorId"], _count: { _all: true } }),
      prisma.courseRegistration.count({ where: { createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } }),
      prisma.courseRegistration.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.courseRegistration.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

  const vehicleData = attemptsByVehicle
    .map((a) => ({ label: VEHICLE_LABELS[a.vehicleType] ?? a.vehicleType, value: a._count._all }))
    .sort((a, b) => b.value - a.value);

  const mentorData = regsByMentor
    .map((r) => ({
      label: MENTORS.find((m) => m.id === r.mentorId)?.name ?? r.mentorId,
      value: r._count._all,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const revenuePaid = revenue._sum.amount ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Statistik Sistem</h1>
      <p className="mt-1 text-sm text-neutral-500">Ringkasan pengguna, kursus, pembayaran, dan pendaftaran.</p>

      {/* Statistik pengguna */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">Statistik Pengguna</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminCard label="Total User" value={totalUsers} />
        <AdminCard label="User Baru (bulan ini)" value={newUsersMonth} />
        <AdminCard label="User Aktif (pernah simulasi)" value={usersWithAttempts} />
      </div>

      {/* Statistik kursus */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">Statistik Kursus</h2>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Kendaraan Paling Banyak Disimulasikan</h3>
          <div className="mt-4">
            <AdminChart data={vehicleData.length ? vehicleData : [{ label: "-", value: 0 }]} height={140} />
          </div>
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="font-semibold text-neutral-900 dark:text-white">Mentor Paling Dipilih</h3>
          {mentorData.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-400">Belum ada pendaftaran.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {mentorData.map((m) => (
                <li key={m.label} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">{m.label}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {m.value} pendaftaran
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Statistik pembayaran */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">Statistik Pembayaran</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <AdminCard label="Total Transaksi" value={totalTransactions} />
        <AdminCard label="Total Pendapatan" value={`Rp ${revenuePaid.toLocaleString("id-ID")}`} accent="text-emerald-600 dark:text-emerald-400" />
        <AdminCard label="Pending" value={pendingPayments} accent="text-amber-600 dark:text-amber-400" />
        <AdminCard label="Berhasil" value={paidPayments} accent="text-emerald-600 dark:text-emerald-400" />
        <AdminCard label="Ditolak" value={rejectedPayments} accent="text-red-600 dark:text-red-400" />
      </div>

      {/* Statistik pendaftaran */}
      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">Statistik Pendaftaran</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <AdminCard label="Harian" value={regsToday} />
        <AdminCard label="Mingguan" value={regsWeek} />
        <AdminCard label="Bulanan" value={regsMonth} />
      </div>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Status Pembayaran</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <StatusBadge status="pending" />
          <StatusBadge status="paid" />
          <StatusBadge status="rejected" />
          <StatusBadge status="refunded" />
        </div>
      </div>
    </div>
  );
}
