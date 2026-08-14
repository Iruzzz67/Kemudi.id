import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { PaymentsTable } from "@/components/admin/PaymentsTable";
import { AdminCard } from "@/components/admin/AdminCard";

export const metadata: Metadata = {
  title: "Admin - Pembayaran | Kemudi.id",
};

export default async function AdminPaymentsPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  const [pending, paid, rejected, revenue] = await Promise.all([
    prisma.courseRegistration.count({ where: { status: "pending" } }),
    prisma.courseRegistration.count({ where: { status: "paid" } }),
    prisma.courseRegistration.count({ where: { status: "rejected" } }),
    prisma.courseRegistration.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Verifikasi Pembayaran</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Hanya admin yang dapat mengubah status pembayaran menjadi berhasil.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminCard label="Pending" value={pending} accent="text-amber-600 dark:text-amber-400" />
        <AdminCard label="Berhasil" value={paid} accent="text-emerald-600 dark:text-emerald-400" />
        <AdminCard label="Ditolak" value={rejected} accent="text-red-600 dark:text-red-400" />
        <AdminCard
          label="Total Pendapatan"
          value={`Rp ${(revenue._sum.amount ?? 0).toLocaleString("id-ID")}`}
          accent="text-neutral-900 dark:text-white"
        />
      </div>

      <div className="mt-6">
        <PaymentsTable />
      </div>
    </div>
  );
}
