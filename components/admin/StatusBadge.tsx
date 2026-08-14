const VARIANTS: Record<string, string> = {
  // hijau — sukses / aktif
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  confirmed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  available: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  // kuning — menunggu
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  // merah — ditolak / dibatalkan / nonaktif
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  inactive: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  // biru — terisi / penuh
  full: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  // ungu — refund
  refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  // abu — selesai / user
  completed: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  user: "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  admin: "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
};

const LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Dikonfirmasi",
  confirmed: "Dikonfirmasi",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
  active: "Aktif",
  inactive: "Nonaktif",
  available: "Tersedia",
  full: "Penuh",
  completed: "Selesai",
  refunded: "Refund",
  user: "User",
  admin: "Admin",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status?.toLowerCase();
  const cls = VARIANTS[key] ?? "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
  const label = LABELS[key] ?? status;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {label}
    </span>
  );
}
