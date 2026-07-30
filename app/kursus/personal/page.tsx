"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PersonalDataPage() {
  const router = useRouter();
  const params = useSearchParams();
  const mentor = params?.get("mentor") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email) {
      setError("Nama dan email wajib diisi.");
      return;
    }

    const qs = new URLSearchParams({
      mentor,
      name,
      email,
      phone,
    }).toString();

    router.push(`/kursus/payment?${qs}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Data Pribadi</h1>
      <p className="mt-1 text-sm text-neutral-500">Isi data pribadi Anda sebelum melanjutkan ke pembayaran.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Nama Lengkap</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">No. Telepon (opsional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Link href="/kursus" className="rounded-full border px-4 py-2">Batal</Link>
          <button type="submit" className="ml-auto rounded-full bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
            Lanjut ke Pembayaran
          </button>
        </div>
      </form>
    </div>
  );
}
