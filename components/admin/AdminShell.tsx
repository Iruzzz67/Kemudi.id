"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/pendaftaran", label: "Pendaftaran", icon: "📋" },
  { href: "/admin/pengguna", label: "Pengguna", icon: "👥" },
  { href: "/admin/mentor", label: "Mentor", icon: "🧑‍🏫" },
  { href: "/admin/jadwal", label: "Jadwal", icon: "🗓️" },
  { href: "/admin/pembayaran", label: "Pembayaran", icon: "💳" },
  { href: "/admin/kursus", label: "Kursus", icon: "🎓" },
  { href: "/admin/statistik", label: "Statistik", icon: "📈" },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "⚙️" },
];

type AdminUser = { id: string; name?: string | null; email: string; role: string };

export function AdminShell({
  admin,
  children,
}: {
  admin: AdminUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notif, setNotif] = useState(0);

  // Notifikasi admin (§31): pendaftaran & pembayaran yang menunggu verifikasi.
  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setNotif((d.pendingRegistrations ?? 0) + (d.pendingPayments ?? 0));
      })
      .catch(() => {});
  }, [pathname]);

  // Tutup drawer saat berpindah halaman.
  useEffect(() => setOpen(false), [pathname]);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <Link href="/admin/dashboard" className="text-lg font-black tracking-tight text-white">
          Kemudi<span className="text-emerald-400">.id</span>
        </Link>
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
          Admin
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
              {item.href === "/admin/pendaftaran" && notif > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {notif}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-800 p-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
            {(admin.name || admin.email).charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">
              {admin.name || "Administrator"}
            </div>
            <div className="truncate text-xs text-neutral-500">{admin.email}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="mt-2 w-full rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-neutral-900 lg:block">
        {sidebarContent}
      </aside>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-neutral-900 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Header admin */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90 sm:px-6">
          <button
            onClick={() => setOpen(true)}
            className="rounded-md border border-neutral-300 p-2 text-neutral-600 lg:hidden dark:border-neutral-700 dark:text-neutral-300"
            aria-label="Buka menu admin"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            </svg>
          </button>

          <span className="hidden text-sm font-semibold uppercase tracking-wider text-neutral-500 sm:block">
            Panel Administrasi
          </span>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/admin/pendaftaran"
              title="Notifikasi verifikasi"
              className="relative rounded-full border border-neutral-300 p-2 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              🔔
              {notif > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notif}
                </span>
              )}
            </Link>
            <Link
              href="/"
              className="hidden rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 sm:block dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Lihat Situs
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
