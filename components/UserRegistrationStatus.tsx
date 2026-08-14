"use client";

import { MENTORS } from "@/lib/kursus-data";

export type RegistrationStatusData = {
  id: string;
  mentorId: string;
  name: string;
  email: string;
  phone?: string | null;
  paymentMethod: string;
  amount: number;
  status: string; // "pending" | "paid"
  startDate: string;
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  transfer: "Transfer Bank",
  "e-wallet": "E-Wallet / QRIS",
  cash: "Bayar di Tempat",
};

// Status pendaftaran dibaca dari basis data (dikirim dari server component
// Dashboard). Konfirmasi pembayaran hanya bisa dilakukan ADMIN — di halaman
// /admin/pendaftaran — jadi tidak ada tombol "tandai bayar" di sini.
export default function UserRegistrationStatus({
  registration,
}: {
  registration: RegistrationStatusData | null;
}) {
  if (!registration) return null;

  const mentor = MENTORS.find((m) => m.id === registration.mentorId) || null;
  const methodLabel = PAYMENT_METHOD_LABEL[registration.paymentMethod] ?? registration.paymentMethod;

  return (
    <div className="mt-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-lg font-semibold">Status Pendaftaran</h3>
      <div className="mt-3 text-sm">
        <div>
          <span className="text-neutral-500">Nama: </span>
          <span className="font-medium">{registration.name}</span>
        </div>
        <div>
          <span className="text-neutral-500">Mentor: </span>
          <span className="font-medium">{mentor ? mentor.name : registration.mentorId}</span>
        </div>
        <div>
          <span className="text-neutral-500">Metode Pembayaran: </span>
          <span className="font-medium">{methodLabel}</span>
        </div>
        <div>
          <span className="text-neutral-500">Status: </span>
          <span className="font-medium">
            {registration.status === "paid"
              ? "Lunas"
              : registration.status === "rejected"
                ? "Ditolak"
                : "Menunggu pembayaran"}
          </span>
        </div>

        {registration.status === "rejected" && (
          <div className="mt-3 rounded-md bg-red-50 p-3">
            <div className="text-sm font-medium">Pembayaran ditolak admin ✖</div>
            <div className="mt-1 text-sm">
              Mohon hubungi admin untuk informasi lebih lanjut.
            </div>
          </div>
        )}

        {registration.status === "paid" && (
          <div className="mt-3 rounded-md bg-green-50 p-3">
            <div className="text-sm font-medium">Pembayaran terkonfirmasi admin ✅</div>
            <div className="mt-1 text-sm">Mulai latihan pada: <strong>{registration.startDate || "Segera"}</strong></div>
            <div className="text-sm">Kontak mentor: <strong>{mentor?.phone || "-"}</strong></div>
          </div>
        )}

        {registration.status === "pending" && (
          <div className="mt-3 rounded-md bg-yellow-50 p-3">
            <div className="text-sm font-medium">Menunggu konfirmasi admin ⏳</div>
            <div className="mt-1 text-sm">
              Pembayaran Anda sedang diverifikasi oleh admin. Silakan cek kembali nanti.
            </div>
            {registration.paymentMethod === "cash" && (
              <div className="mt-1 text-sm">
                Datang pada: <strong>{registration.startDate || "TBA"}</strong> · Jumlah:{" "}
                <strong>Rp {registration.amount.toLocaleString("id-ID")}</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
