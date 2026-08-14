import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";

// Layout seluruh halaman admin (kecuali /admin/login). Validasi ulang di
// server — tidak hanya mengandalkan proxy.ts.
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
