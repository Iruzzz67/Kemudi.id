import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PendaftaranTable } from "@/components/admin/PendaftaranTable";
import { AdminCard } from "@/components/admin/AdminCard";

export const metadata: Metadata = {
  title: "Admin - Pendaftaran | Kemudi.id",
};

export default async function AdminPendaftaranPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [registrations, pendingCount, paidCount, rejectedCount] = await Promise.all([
    prisma.courseRegistration.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.courseRegistration.count({ where: { status: "pending" } }),
    prisma.courseRegistration.count({ where: { status: "paid" } }),
    prisma.courseRegistration.count({ where: { status: "rejected" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Pendaftaran Kursus</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Verifikasi pendaftaran dan konfirmasi pembayaran pelanggan.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminCard label="Total" value={registrations.length} />
        <AdminCard label="Pending" value={pendingCount} accent="text-amber-600 dark:text-amber-400" />
        <AdminCard label="Dikonfirmasi" value={paidCount} accent="text-emerald-600 dark:text-emerald-400" />
        <AdminCard label="Ditolak" value={rejectedCount} accent="text-red-600 dark:text-red-400" />
      </div>

      <div className="mt-6">
        <PendaftaranTable
          registrations={registrations.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      </div>
    </div>
  );
}
