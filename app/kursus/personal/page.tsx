"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { MENTORS } from "@/lib/kursus-data";

type PaymentMethod = "transfer" | "e-wallet" | "cash";

type Registration = {
  mentorId: string;
  name: string;
  email: string;
  phone: string;
  nik: string;
  address: string;
  paymentMethod: PaymentMethod;
  status: "pending" | "paid";
  amount: number;
  startDate: string;
};

function PersonalDataForm() {
  const router = useRouter();
  const params = useSearchParams();
  const mentorId = params?.get("mentor") || "";
  const mentor = MENTORS.find((m) => m.id === mentorId);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nik, setNik] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("transfer");
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedBank, setSelectedBank] = useState("bca");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !nik || !address) {
      setError("Nama, email, NIK, dan alamat wajib diisi.");
      return;
    }

    const newRegistration: Registration = {
      mentorId,
      name,
      email,
      phone,
      nik,
      address,
      paymentMethod,
      status: "pending",
      amount: 350000,
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    if (paymentMethod === "cash") {
      newRegistration.startDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    // Simpan ke server (basis data) — status pembayaran hanya bisa
    // dikonfirmasi oleh admin, bukan oleh pengguna sendiri.
    setSubmitting(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRegistration),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Gagal menyimpan pendaftaran.");
      }
      setRegistration(newRegistration);
      setShowPayment(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan pendaftaran.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-bold">Data Diri & Pembayaran</h1>
      <p className="mt-1 text-sm text-neutral-500">Lengkapi data diri Anda dan pilih metode pembayaran untuk melanjutkan pendaftaran.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800">
          <div>
            <label className="block text-sm font-medium">Nama Lengkap</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          </div>

          <div>
            <label className="block text-sm font-medium">No. Telepon (opsional)</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          </div>

          <div>
            <label className="block text-sm font-medium">NIK</label>
            <input type="text" value={nik} onChange={(e) => setNik(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" />
          </div>

          <div>
            <label className="block text-sm font-medium">Alamat</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900" rows={3} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Link href="/kursus" className="rounded-full border px-4 py-2">Batal</Link>
            <button type="submit" disabled={submitting} className="ml-auto rounded-full bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? "Menyimpan..." : "Lanjutkan Pendaftaran"}</button>
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

          {showPayment && registration ? (
            <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
              <h2 className="font-semibold">Instruksi Pembayaran</h2>
              <div className="mt-3 space-y-4">
                <div>
                  <div className="text-sm text-neutral-500">Pilih metode:</div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className={`rounded-full px-3 py-1 ${registration.paymentMethod === "transfer" ? "bg-blue-50 border border-blue-500" : "border"}`} onClick={() => setRegistration({ ...registration, paymentMethod: "transfer" })}>Transfer Bank</button>
                    <button type="button" className={`rounded-full px-3 py-1 ${registration.paymentMethod === "e-wallet" ? "bg-blue-50 border border-blue-500" : "border"}`} onClick={() => setRegistration({ ...registration, paymentMethod: "e-wallet" })}>E-Wallet / QRIS</button>
                    <button type="button" className={`rounded-full px-3 py-1 ${registration.paymentMethod === "cash" ? "bg-blue-50 border border-blue-500" : "border"}`} onClick={() => setRegistration({ ...registration, paymentMethod: "cash" })}>Bayar di Tempat</button>
                  </div>
                </div>

                {registration.paymentMethod === "transfer" && (
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-neutral-500">Pilih bank tujuan</div>
                    <div className="mt-3 flex flex-col gap-2">
                      <label className="flex items-center gap-3">
                        <input type="radio" name="bank" checked={selectedBank === "bca"} onChange={() => setSelectedBank("bca")} />
                        <div>
                          <div className="font-medium">BCA</div>
                          <div className="text-sm text-neutral-500">No. Rekening: <strong>1234-5678-901</strong></div>
                        </div>
                      </label>
                      <label className="flex items-center gap-3">
                        <input type="radio" name="bank" checked={selectedBank === "bni"} onChange={() => setSelectedBank("bni")} />
                        <div>
                          <div className="font-medium">BNI</div>
                          <div className="text-sm text-neutral-500">No. Rekening: <strong>9876-5432-100</strong></div>
                        </div>
                      </label>
                      <div className="mt-3">
                        <button type="button" className="rounded-full border px-3 py-1 text-sm" onClick={() => { const acc = selectedBank === "bca" ? "12345678901" : "98765432100"; navigator.clipboard?.writeText(acc); alert("Nomor rekening disalin ke clipboard"); }}>Salin Nomor Rekening</button>
                      </div>
                      <div className="mt-3 text-sm text-neutral-600">Jumlah: <strong>Rp {registration.amount?.toLocaleString("id-ID")}</strong></div>
                    </div>
                  </div>
                )}

                {registration.paymentMethod === "e-wallet" && (
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-neutral-500">Bayar via QRIS atau e-wallet</div>
                    <div className="mt-3 flex gap-4 items-center">
                      <div className="h-28 w-28 rounded-md bg-neutral-100 flex items-center justify-center">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="8" height="8" fill="#111827" /><rect x="14" y="2" width="8" height="8" fill="#111827" /><rect x="2" y="14" width="8" height="8" fill="#111827" /></svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">QRIS Kemudi.id</div>
                        <div className="text-sm text-neutral-500">Scan QR pada aplikasi dompet digital Anda.</div>
                        <div className="mt-3">
                          <div className="text-sm font-medium">Atau transfer ke e-wallet:</div>
                          <ul className="mt-2 text-sm">
                            <li>OVO: <strong>0812-3456-7890</strong></li>
                            <li>GoPay: <strong>0812-3456-7890</strong></li>
                            <li>Dana: <strong>0812-3456-7890</strong></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {registration.paymentMethod === "cash" && (
                  <div className="rounded-md border p-4">
                    <div className="text-sm">Bayar di tempat saat verifikasi.</div>
                    <div className="mt-2 text-sm">Datang pada: <strong>{registration.startDate}</strong></div>
                    <div className="text-sm">Jumlah: <strong>Rp {registration.amount?.toLocaleString("id-ID")}</strong></div>
                  </div>
                )}

                <div className="mt-4 rounded-md bg-blue-50 p-4 dark:bg-blue-950/30">
                  <div className="text-sm font-medium">Menunggu konfirmasi admin ✅</div>
                  <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    Pembayaran Anda akan diverifikasi oleh admin. Status pendaftaran bisa dicek di
                    Dashboard.
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Selesai, ke Dashboard
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800">
              <h2 className="font-semibold">Metode Pembayaran</h2>
              <div className="mt-3 space-y-2">
                {[
                  { id: "transfer", label: "Transfer Bank", desc: "Transfer ke rekening resmi Kemudi.id" },
                  { id: "e-wallet", label: "E-Wallet", desc: "Dana, OVO, atau GoPay" },
                  { id: "cash", label: "Bayar di Tempat", desc: "Pembayaran langsung saat verifikasi" },
                ].map((option) => (
                  <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${paymentMethod === option.id ? "border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/30" : "border-neutral-200 dark:border-neutral-700"}`}>
                    <input type="radio" checked={paymentMethod === option.id} onChange={() => setPaymentMethod(option.id as PaymentMethod)} className="mt-1" />
                    <span>
                      <span className="block font-medium">{option.label}</span>
                      <span className="text-sm text-neutral-500">{option.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PersonalDataPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-neutral-400">
          Memuat data pendaftaran...
        </div>
      }
    >
      <PersonalDataForm />
    </Suspense>
  );
}
