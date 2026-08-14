"use client";

import { useState, Suspense } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setLoading(false);
      setError("Email atau password salah.");
      return;
    }

    // Ambil sesi untuk memastikan role = ADMIN (user biasa ditolak di sini).
    const session = await fetch("/api/auth/session").then((r) => r.json()).catch(() => null);

    if (!session?.user || session.user.role !== "ADMIN") {
      // User biasa yang mencoba login di halaman admin → log out & tolak.
      await signOut({ redirect: false });
      setLoading(false);
      setError("Akun ini tidak memiliki akses admin.");
      return;
    }

    setLoading(false);
    router.push(callbackUrl.startsWith("/admin") ? callbackUrl : "/admin/dashboard");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 px-4 py-12 text-neutral-100">
      <Link href="/" className="text-3xl font-black tracking-tight">
        Kemudi<span className="text-emerald-400">.id</span>
      </Link>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
        Admin Dashboard
      </p>

      <div className="mt-8 w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@kemudi.id"
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 font-bold tracking-wide text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Memeriksa..." : "LOGIN ADMIN"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          ← Kembali ke Kemudi.id
        </Link>
      </div>

      <p className="mt-6 text-xs text-neutral-600">
        Area terbatas. Hanya akun dengan role ADMIN yang dapat mengakses.
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
