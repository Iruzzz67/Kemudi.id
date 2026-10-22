"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Car, ShieldCheck, Award } from "lucide-react";

interface FooterProps {
  onNavigate?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <footer className="border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950 text-slate-600 dark:text-neutral-400 text-sm transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <Car className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                Kemudi<span className="text-blue-600 dark:text-blue-500">.id</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed">
              Platform edukasi mengemudi interaktif ramah pemula. Latihan teori rambu, teknik kopling, dan simulasi 3D sebelum praktik di jalan raya.
            </p>
            <div className="pt-2 text-xs text-slate-400 dark:text-neutral-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Standar Kurikulum Perhubungan RI & BNSP</span>
            </div>
          </div>

          {/* Nav Links */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-200 uppercase tracking-wider mb-3">
              Eksplorasi
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Beranda Utama
                </Link>
              </li>
              <li>
                <Link
                  href="/kursus"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Paket Kursus & Pilihan Mentor
                </Link>
              </li>
              <li>
                <Link
                  href="/materi"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Katalog Materi Teori & Rambu
                </Link>
              </li>
              <li>
                <Link
                  href="/simulasi"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Simulasi 3D Interaktif
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition"
                >
                  Dashboard & Riwayat Siswa
                </Link>
              </li>
            </ul>
          </div>

          {/* Vehicle Categories */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-200 uppercase tracking-wider mb-3">
              Kategori Kendaraan
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Mobil (SIM A) · Manual & Matic</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Sepeda Motor (SIM C) · Safety Riding</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>Truk Ringan & Niaga (SIM B1)</span>
              </li>
            </ul>
          </div>

          {/* Safety Notice */}
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-neutral-200 uppercase tracking-wider mb-3">
              Prinsip Keselamatan
            </h4>
            <p className="text-xs text-slate-500 dark:text-neutral-400 leading-relaxed mb-3">
              Keselamatan di jalan raya dimulai dari kesadaran mematuhi rambu, menggunakan sabuk pengaman, dan menghormati hak pejalan kaki.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Award className="w-4 h-4" />
              <span>Sertifikasi Kelulusan Digital Terverifikasi</span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-neutral-500 gap-3">
          <p>© {new Date().getFullYear()} Kemudi.id — Edukasi Praktis Ramah Pemula. Hak cipta dilindungi.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-800 dark:hover:text-neutral-300">Kebijakan Privasi</span>
            <span>·</span>
            <span className="hover:text-slate-800 dark:hover:text-neutral-300">Syarat & Ketentuan</span>
            <span>·</span>
            <span className="hover:text-slate-800 dark:hover:text-neutral-300">Bantuan Instruktur</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
