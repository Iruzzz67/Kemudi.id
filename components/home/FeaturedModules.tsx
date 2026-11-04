import React from 'react';
import { THEORY_MODULES } from '@/data/mockData';
import { TheoryModule } from '@/types/ui';
import { BookOpen, Clock, ArrowRight, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';

interface FeaturedModulesProps {
  onSelectModule: (module: TheoryModule) => void;
  onViewAllModules: () => void;
}

export const FeaturedModules: React.FC<FeaturedModulesProps> = ({
  onSelectModule,
  onViewAllModules,
}) => {
  return (
    <section className="py-16 bg-slate-50 dark:bg-neutral-950/80 border-y border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Kurikulum Teori Esensial
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Materi Teori & Rambu Lalu Lintas
            </h2>
            <p className="text-sm text-slate-600 dark:text-neutral-400 mt-2 max-w-xl">
              Pahami aturan dasar sebelum memegang kemudi. Teori yang matang menjamin keputusan yang aman saat menghadapi situasi mendadak di jalan raya.
            </p>
          </div>

          <button
            onClick={onViewAllModules}
            className="self-start md:self-auto text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>Lihat Semua Modul</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {THEORY_MODULES.slice(0, 3).map((module) => (
            <div
              key={module.id}
              onClick={() => onSelectModule(module)}
              className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900 transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-3">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {module.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{module.readTimeMinutes} menit baca</span>
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                  {module.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-neutral-400 line-clamp-3 leading-relaxed mb-4">
                  {module.summary}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-neutral-800/80 flex items-center justify-between text-xs font-medium text-slate-700 dark:text-neutral-300">
                <span className="group-hover:underline">Buka Artikel Lengkap</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
