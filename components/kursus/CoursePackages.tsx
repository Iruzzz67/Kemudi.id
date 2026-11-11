import React from 'react';
import { COURSE_PACKAGES } from '@/data/mockData';
import { CoursePackage } from '@/types/ui';
import { Check, Star, ShieldCheck, Zap } from 'lucide-react';

interface CoursePackagesProps {
  selectedPackage: CoursePackage | null;
  onSelectPackage: (pkg: CoursePackage) => void;
}

export const CoursePackages: React.FC<CoursePackagesProps> = ({
  selectedPackage,
  onSelectPackage,
}) => {
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pilihan Paket Kursus Mengemudi
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-neutral-400">
          Setiap paket sudah mencakup akses simulator 3D interaktif tanpa batas serta pendampingan ujian SIM resmi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {COURSE_PACKAGES.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          return (
            <div
              key={pkg.id}
              className={`relative rounded-2xl border transition-all flex flex-col justify-between p-6 ${
                pkg.isPopular
                  ? 'border-blue-600 dark:border-blue-500 shadow-md ring-1 ring-blue-600 dark:ring-blue-500 bg-white dark:bg-neutral-900'
                  : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
              }`}
            >
              {pkg.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold tracking-wide flex items-center gap-1 shadow-sm uppercase">
                  <Star className="w-3 h-3 fill-current" />
                  Paling Diminati
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {pkg.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 min-h-[32px]">
                  {pkg.subtitle}
                </p>

                {/* Price */}
                <div className="my-5 pb-5 border-b border-slate-100 dark:border-neutral-800">
                  <div className="text-xs text-slate-400 line-through">
                    {formatRupiah(pkg.originalPrice)}
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {formatRupiah(pkg.price)}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
                    {pkg.sessionsCount} Sesi Latihan · Durasi {pkg.duration}
                  </div>
                </div>

                {/* Features list */}
                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-neutral-300 mb-6">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onSelectPackage(pkg)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white'
                    : pkg.isPopular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                    : 'border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-900 dark:text-white'
                }`}
              >
                {isSelected ? '✓ Paket Terpilih' : 'Pilih Paket Ini'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
