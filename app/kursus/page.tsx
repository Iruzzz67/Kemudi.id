"use client";

import Link from "next/link";
import { COURSE_PACKAGES, MENTORS, SCHEDULE_SLOTS, WHAT_YOU_GET, formatRupiah } from "@/lib/kursus-data";
import { VEHICLES, VEHICLE_ORDER, VehicleType } from "@/lib/vehicles";
import { useState } from "react";
import { MentorSelector } from "@/components/kursus/MentorSelector";

export default function KursusPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">Kursus Mengemudi</h1>
      <p className="mt-2 max-w-2xl text-neutral-500">
        Pilih paket kursus, jadwal, dan mentor sesuai kebutuhan Anda. Semua paket sudah termasuk
        akses simulasi 3D interaktif Kemudi.id.
      </p>

      {/* Daftar kursus & estimasi harga */}
      <section id="paket" className="mt-12">
        <h2 className="text-2xl font-bold">Daftar Kursus & Estimasi Harga</h2>
        <p className="mt-1 text-neutral-500">
          Harga di bawah adalah estimasi per paket, sudah termasuk seluruh sesi dan materi.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COURSE_PACKAGES.map((pkg) => {
            const vehicle = VEHICLES[pkg.vehicleType];
            return (
              <div
                key={pkg.id}
                className="flex flex-col rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: vehicle.color }}
                  >
                    {vehicle.label}
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                    {pkg.level}
                  </span>
                </div>

                <div className="mt-3 text-lg font-semibold">{pkg.label}</div>
                <p className="mt-1 text-sm text-neutral-500">{pkg.description}</p>

                <div className="mt-4 text-2xl font-bold text-blue-600">{formatRupiah(pkg.price)}</div>
                <div className="text-xs text-neutral-400">
                  {pkg.sessions}x sesi &middot; {pkg.sessionDurationMin} menit/sesi
                </div>

                <ul className="mt-4 space-y-1.5 text-sm text-neutral-600 dark:text-neutral-400">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-blue-600">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="#mentor"
                  className="mt-5 rounded-full bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Pilih Paket Ini
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Jadwal */}
      <section id="jadwal" className="mt-14">
        <h2 className="text-2xl font-bold">Jadwal Tersedia</h2>
        <p className="mt-1 text-neutral-500">
          Sesi dijadwalkan ulang dengan mentor Anda setelah pendaftaran, sesuai slot berikut.
        </p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCHEDULE_SLOTS.map((slot) => (
            <div
              key={slot.id}
              className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <div className="font-semibold">{slot.days}</div>
              <div className="text-sm text-neutral-500">{slot.time}</div>
              {slot.note && (
                <div className="mt-1 text-xs font-medium text-blue-600">{slot.note}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Apa yang didapatkan */}
      <section className="mt-14">
        <h2 className="text-2xl font-bold">Apa yang Anda Dapatkan</h2>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {WHAT_YOU_GET.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
              <span className="mt-0.5 text-blue-600">✓</span>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Mentor */}
      <section id="mentor" className="mt-14 scroll-mt-20">
        <h2 className="text-2xl font-bold">Pilih Mentor Anda</h2>
        <p className="mt-1 text-neutral-500">
          Setiap mentor mendampingi Anda selama kursus berlangsung. Lihat portofolio masing-masing
          sebelum memilih.
        </p>
        <div className="mt-6">
          <div className="mb-4">
            <div className="text-sm text-neutral-500">Pilih Kendaraan yang Ingin Dikursuskan</div>
            <div className="mt-2 flex gap-2">
              {VEHICLE_ORDER.map((vt) => {
                const v = VEHICLES[vt];
                return (
                  <button
                    key={vt}
                    type="button"
                    data-vehicletype={vt}
                    className={`rounded-full px-3 py-1 text-sm font-medium text-white`} 
                    style={{ backgroundColor: v.color }}
                    onClick={() => setSelectedVehicle((s) => (s === vt ? null : vt))}
                  >
                    {v.label}
                  </button>
                );
              })}
            </div>
          </div>

          <MentorSelector mentors={selectedVehicle ? MENTORS.filter((m) => m.vehicleTypes.includes(selectedVehicle)) : MENTORS} />
        </div>
      </section>
    </div>
  );
}
