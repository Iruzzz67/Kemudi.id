"use client";

import Link from "next/link";
import { useState } from "react";
import { Mentor } from "@/lib/kursus-data";
import { VEHICLES } from "@/lib/vehicles";

function Avatar({ mentor, size = 56 }: { mentor: Mentor; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ backgroundColor: mentor.avatarColor, width: size, height: size, fontSize: size * 0.36 }}
    >
      {mentor.initials}
    </div>
  );
}

export function MentorSelector({ mentors }: { mentors: Mentor[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = mentors.find((m) => m.id === selectedId) ?? null;

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {mentors.map((mentor) => {
          const isSelected = mentor.id === selectedId;
          return (
            <div
              key={mentor.id}
              className={`rounded-xl border p-5 transition ${
                isSelected
                  ? "border-blue-500 ring-1 ring-blue-500"
                  : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-start gap-4">
                <Avatar mentor={mentor} />
                <div className="min-w-0">
                  <div className="font-semibold">{mentor.name}</div>
                  <div className="text-sm text-neutral-500">{mentor.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-sm">
                    <span className="text-amber-500">★</span>
                    <span className="font-medium">{mentor.rating}</span>
                    <span className="text-neutral-400">
                      · {mentor.experienceYears} th pengalaman · {mentor.studentsTrained}+ murid
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{mentor.bio}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {mentor.vehicleTypes.map((vt) => (
                  <span
                    key={vt}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                    style={{ backgroundColor: VEHICLES[vt].color }}
                  >
                    {VEHICLES[vt].label}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedId(mentor.id)}
                  className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                  }`}
                >
                  {isSelected ? "Mentor Terpilih ✓" : "Pilih Mentor Ini"}
                </button>
                <Link
                  href={`/kursus/mentor/${mentor.id}`}
                  className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
                >
                  Lihat Portofolio
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div
        className={`mt-6 flex flex-col items-center justify-between gap-3 rounded-xl border p-5 text-center sm:flex-row sm:text-left ${
          selected
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-dashed border-neutral-300 dark:border-neutral-700"
        }`}
      >
        {selected ? (
          <div className="flex items-center gap-3">
            <Avatar mentor={selected} size={40} />
            <div>
              <div className="text-sm text-neutral-500">Mentor pilihan Anda</div>
              <div className="font-semibold">{selected.name}</div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Pilih salah satu mentor di atas untuk melanjutkan pendaftaran.</div>
        )}
        <Link
          href={selected ? `/kursus/personal?mentor=${selected.id}` : "#"}
          aria-disabled={!selected}
          className={`rounded-full px-6 py-2.5 font-semibold text-white transition ${
            selected ? "bg-blue-600 hover:bg-blue-700" : "pointer-events-none bg-neutral-300 dark:bg-neutral-700"
          }`}
        >
          Lanjutkan Pendaftaran
        </Link>
      </div>
    </div>
  );
}
