import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SchedulesTable } from "@/components/admin/SchedulesTable";
import { AdminCard } from "@/components/admin/AdminCard";

export const metadata: Metadata = {
  title: "Admin - Jadwal | Kemudi.id",
};

export default async function AdminSchedulePage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [mentors, totalSchedules, available, full] = await Promise.all([
    prisma.mentor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.schedule.count(),
    prisma.schedule.count({ where: { status: "AVAILABLE" } }),
    prisma.schedule.count({ where: { status: "FULL" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Manajemen Jadwal</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Kelola jadwal kursus per mentor, kendaraan, dan lokasi.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminCard label="Total Jadwal" value={totalSchedules} />
        <AdminCard label="Tersedia" value={available} accent="text-emerald-600 dark:text-emerald-400" />
        <AdminCard label="Penuh" value={full} accent="text-blue-600 dark:text-blue-400" />
      </div>

      <div className="mt-6">
        <SchedulesTable mentors={mentors} />
      </div>
    </div>
  );
}
