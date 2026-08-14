"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/kursus", label: "Kursus" },
  { href: "/materi", label: "Materi" },
  { href: "/simulasi", label: "Simulasi" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Area admin punya layout sendiri (sidebar + header) — jangan tampilkan
  // navbar pengguna di sini.
  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50 h-16 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <nav className="mx-auto flex h-full max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold">
          Kemudi<span className="text-blue-600">.id</span>
        </Link>

        <div className="flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                pathname === link.href
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {status === "authenticated" ? (
            <>
              {session.user?.role === "ADMIN" && (
                <Link
                  href="/admin/dashboard"
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    pathname.startsWith("/admin")
                      ? "bg-emerald-600 text-white"
                      : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  }`}
                >
                  🛡️ Admin
                </Link>
              )}
              <span className="hidden text-sm text-neutral-500 sm:inline">
                {session.user?.email}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                Keluar
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Daftar
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
