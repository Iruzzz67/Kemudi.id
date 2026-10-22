"use client";

import { useEffect, useState } from "react";
import { MENTORS } from "@/lib/kursus-data";

type Registration = {
  mentorId: string;
  name: string;
  email: string;
  phone?: string;
  paymentMethod: string;
  status: "pending" | "paid";
  amount?: number;
  startDate?: string;
};

export default function UserRegistrationStatus() {
  const [reg, setReg] = useState<Registration | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("kemudi_registration");
        if (raw) return JSON.parse(raw) as Registration;
      } catch {
        // ignore
      }
    }
    return null;
  });

  const save = (r: Registration) => {
    if (typeof window !== "undefined") localStorage.setItem("kemudi_registration", JSON.stringify(r));
    setReg(r);
  };

  if (!reg) return null;

  const mentor = MENTORS.find((m) => m.id === reg.mentorId) || null;

  return (
    <div className="mt-8 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-lg font-semibold">Status Pendaftaran</h3>
      <div className="mt-3 text-sm">
        <div>
          <span className="text-neutral-500">Nama: </span>
          <span className="font-medium">{reg.name}</span>
        </div>
        <div>
          <span className="text-neutral-500">Mentor: </span>
          <span className="font-medium">{mentor ? mentor.name : reg.mentorId}</span>
        </div>
        <div>
          <span className="text-neutral-500">Metode Pembayaran: </span>
          <span className="font-medium">{reg.paymentMethod}</span>
        </div>
        <div>
          <span className="text-neutral-500">Status: </span>
          <span className="font-medium">{reg.status === "paid" ? "Lunas" : "Menunggu pembayaran"}</span>
        </div>
        {reg.paymentMethod === "cash" && reg.status === "pending" && (
          <div className="mt-3 rounded-md bg-yellow-50 p-3">
            <div className="text-sm">Instruksi bayar di tempat:</div>
            <div className="mt-1 text-sm">Datang pada: <strong>{reg.startDate || "TBA"}</strong></div>
            <div className="text-sm">Jumlah yang dibayar: <strong>{reg.amount ? `Rp ${reg.amount.toLocaleString("id-ID")}` : "TBA"}</strong></div>
          </div>
        )}

        {reg.status === "paid" && (
          <div className="mt-3 rounded-md bg-green-50 p-3">
            <div className="text-sm font-medium">Pembayaran berhasil ✅</div>
            <div className="mt-1 text-sm">Mulai latihan pada: <strong>{reg.startDate || "Segera"}</strong></div>
            <div className="text-sm">Kontak mentor: <strong>{mentor?.phone || "-"}</strong></div>
          </div>
        )}

        {reg.status === "pending" && (
          <div className="mt-3 flex gap-2">
            <button
              className="rounded-full bg-green-600 px-4 py-2 text-white"
              onClick={() => {
                const paid: Registration = {
                  ...reg,
                  status: "paid",
                  startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  }),
                };
                save(paid);
              }}
            >
              Tandai Pembayaran Berhasil (simulasi)
            </button>
            <button
              className="rounded-full border px-4 py-2"
              onClick={() => {
                localStorage.removeItem("kemudi_registration");
                setReg(null);
              }}
            >
              Batalkan Pendaftaran
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
