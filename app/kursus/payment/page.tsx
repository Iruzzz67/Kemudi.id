"use client";

import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MENTORS } from "@/lib/kursus-data";

export default function PaymentPage() {
  const params = useSearchParams();
  const router = useRouter();
  const mentorId = params?.get("mentor") || "";
  const name = params?.get("name") || "";
  const email = params?.get("email") || "";
  const phone = params?.get("phone") || "";

  const mentor = MENTORS.find((m) => m.id === mentorId);

  const handlePay = async () => {
    // Placeholder: integrate real payment gateway here
    alert("Pembayaran berhasil (simulasi). Terima kasih, " + name + "!");
    router.push("/dashboard");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold">Pembayaran</h1>
      <p className="mt-1 text-sm text-neutral-500">Periksa data sebelum menyelesaikan pembayaran.</p>

      <div className="mt-6 space-y-4 rounded-md border border-neutral-200 p-4">
        <div>
          <h3 className="text-sm font-medium">Mentor</h3>
          <p className="text-neutral-700">{mentor ? mentor.name : "-"}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Nama</h3>
          <p className="text-neutral-700">{name || "-"}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Email</h3>
          <p className="text-neutral-700">{email || "-"}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium">Telepon</h3>
          <p className="text-neutral-700">{phone || "-"}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <button onClick={() => router.back()} className="rounded-full border px-4 py-2">Kembali</button>
        <button onClick={handlePay} className="ml-auto rounded-full bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
          Bayar Sekarang
        </button>
      </div>
    </div>
  );
}
