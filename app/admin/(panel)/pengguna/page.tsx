import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { UsersTable } from "@/components/admin/UsersTable";

export const metadata: Metadata = {
  title: "Admin - Pengguna | Kemudi.id",
};

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Manajemen Pengguna</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Kelola akun pengguna — ubah role, aktifkan/nonaktifkan, dan lihat detail.
      </p>

      <div className="mt-6">
        <UsersTable currentAdminId={admin.id} />
      </div>
    </div>
  );
}
