import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { CoursesTable } from "@/components/admin/CoursesTable";
import { AdminCard } from "@/components/admin/AdminCard";

export const metadata: Metadata = {
  title: "Admin - Kursus | Kemudi.id",
};

export default async function AdminCoursesPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [total, active] = await Promise.all([
    prisma.course.count(),
    prisma.course.count({ where: { status: "ACTIVE" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Manajemen Kursus</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Kelola paket kursus: tambah, ubah, hapus, aktifkan/nonaktifkan.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminCard label="Total Kursus" value={total} />
        <AdminCard label="Aktif" value={active} accent="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div className="mt-6">
        <CoursesTable />
      </div>
    </div>
  );
}
