import React from 'react';
import { Play, Sparkles, BookOpen, ShieldCheck, Users, Award, ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  onStartSimulation: () => void;
  onExploreCourses: () => void;
  onExploreTheory: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartSimulation,
  onExploreCourses,
  onExploreTheory,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-20 border-b border-slate-200 dark:border-neutral-800 bg-gradient-to-b from-blue-50/50 via-white to-white dark:from-neutral-900/60 dark:via-neutral-950 dark:to-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100/80 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Edukasi Mengemudi Interaktif Ramah Pemula</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]" style={{ textWrap: 'balance' }}>
              Belajar Mengemudi <span className="text-blue-600 dark:text-blue-500">Sebelum Turun</span> ke Jalan Raya.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
              Hilangkan rasa takut dan gugup di jalan raya. Kuasai titik gigit kopling, rambu lalu lintas, etika persimpangan, dan simulasi 3D real-time dengan evaluasi otomatis sebelum praktik langsung bersama instruktur senior.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onStartSimulation}
                className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Mulai Simulasi 3D Sekarang</span>
              </button>

              <button
                onClick={onExploreCourses}
                className="px-5 py-3 rounded-full border border-slate-300 dark:border-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 font-medium text-sm transition focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer"
              >
                <span>Pilih Paket Kursus</span>
              </button>

              <button
                onClick={onExploreTheory}
                className="px-4 py-3 rounded-full text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Modul Teori</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Claim-to-Proof Quantitative Adjacency */}
            <div className="pt-6 border-t border-slate-200 dark:border-neutral-800 grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">
                  4.200+
                </div>
                <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Siswa Lulus SIM A & C
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-500 tabular-nums">
                  98.4%
                </div>
                <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Kelulusan Uji Perdana
                </div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  100%
                </div>
                <div className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Simulator 3D Realistis
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Simulator Preview Showcase Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-neutral-300 ml-2">
                    Simulator Cockpit v2.4
                  </span>
                </div>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Siap Dimainkan
                </span>
              </div>

              {/* Graphic Mockup of the Driving Experience */}
              <div className="my-5 relative rounded-xl bg-slate-950 p-4 text-white overflow-hidden border border-neutral-800">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-xs font-mono text-blue-400">SPEEDOMETER DIGITAL</span>
                    <div className="text-3xl font-bold font-mono tracking-tight text-white tabular-nums">
                      48 <span className="text-xs font-normal text-slate-400">km/j</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-emerald-400">TRANSMISI AKTIF</span>
                    <div className="text-xl font-bold font-mono text-white">GIGI 3 [MANUAL]</div>
                  </div>
                </div>

                {/* Road perspective wireframe/illustration */}
                <div className="h-28 rounded-lg bg-gradient-to-b from-slate-900 via-neutral-950 to-slate-900 flex flex-col items-center justify-center relative border border-neutral-800/80">
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-neutral-900/90 [clip-path:polygon(30%_0%,70%_0%,100%_100%,0%_100%)] flex items-center justify-center">
                    <div className="w-1 h-full border-r-2 border-dashed border-amber-400/80" />
                  </div>
                  <div className="z-10 text-center">
                    <div className="inline-block px-3 py-1 rounded-md bg-blue-600/90 text-white text-xs font-medium shadow-sm mb-1">
                      Zebra Cross di Depan: Pelankan Kecepatan
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Checklist: Sabuk ✓ Spion ✓ Lampu ✓
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>RPM: 2.400 / 7.000</span>
                  <span className="text-emerald-400">Status: Tertib (0 Pelanggaran)</span>
                </div>
              </div>

              {/* Quick Launch CTA */}
              <button
                onClick={onStartSimulation}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium text-sm flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span>Buka Fullscreen Simulator 3D</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
