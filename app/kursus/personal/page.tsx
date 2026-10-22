"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MENTORS } from "@/lib/kursus-data";

type PaymentMethod = "transfer" | "e-wallet" | "cash";

export default function PersonalDataPage() {
  const router = useRouter();
  const params = useSearchParams();
  const mentorId = params?.get("mentor") || "";
  const mentor = MENTORS.find((m) => m.id === mentorId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email) {
      setError("Nama dan email wajib diisi.");
      return;
    }

    const paymentLabel =
      paymentMethod === "transfer"
        ? "Transfer Bank"
        : paymentMethod === "e-wallet"
          ? "E-Wallet"
          : "Bayar di Tempat";

    alert(`Pendaftaran berhasil untuk ${name}. Pembayaran via ${paymentLabel} akan diproses.`);
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">Data Diri & Pembayaran</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Lengkapi data diri Anda dan pilih metode pembayaran untuk melanjutkan pendaftaran.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
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

          <div className="flex gap-2 pt-2">
            <Link href="/kursus" className="rounded-full border px-4 py-2">Batal</Link>
            <button type="submit" className="ml-auto rounded-full bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">
              Lanjutkan Pendaftaran
            </button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="font-semibold">Ringkasan Pendaftaran</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-neutral-500">Mentor</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">{mentor ? mentor.name : "Belum dipilih"}</p>
              </div>
              <div>
                <p className="text-neutral-500">Paket</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">Kursus sesuai kebutuhan Anda</p>
              </div>
              <div>
                <p className="text-neutral-500">Status</p>
                <p className="font-medium text-neutral-800 dark:text-neutral-200">Menunggu pembayaran</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
            <h2 className="font-semibold">Metode Pembayaran</h2>
            <div className="mt-3 space-y-2">
              {[
                {
                  id: "transfer",
                  label: "Transfer Bank",
                  desc: "Transfer ke rekening resmi Kemudi.id",
                },
                {
                  id: "e-wallet",
                  label: "E-Wallet",
                  desc: "Dana, OVO, atau GoPay",
                },
                {
                  id: "cash",
                  label: "Bayar di Tempat",
                  desc: "Pembayaran langsung saat verifikasi",
                },
              ].map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                    paymentMethod === option.id
                      ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30"
                      : "border-neutral-200 dark:border-neutral-700"
                  }`}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === option.id}
                    onChange={() => setPaymentMethod(option.id as PaymentMethod)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    <span className="text-sm text-neutral-500">{option.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
