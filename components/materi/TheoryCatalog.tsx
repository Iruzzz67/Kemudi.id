import React, { useState } from 'react';
import { THEORY_MODULES } from '@/data/mockData';
import { ModuleCategory, TheoryModule } from '@/types/ui';
import { Search, Clock, ArrowRight, BookOpen, ShieldAlert, Compass } from 'lucide-react';
import { TrafficSignSvg } from './TrafficSignSvg';

interface TheoryCatalogProps {
  onSelectModule: (module: TheoryModule) => void;
  onOpenSimulator: () => void;
}

export const TheoryCatalog: React.FC<TheoryCatalogProps> = ({
  onSelectModule,
  onOpenSimulator,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['SEMUA', 'UMUM', 'MOBIL', 'MOTOR', 'TRUK'];

  const filteredModules = THEORY_MODULES.filter((m) => {
    const matchesCat = selectedCategory === 'SEMUA' || m.category === selectedCategory;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Peraturan & Etika Berkendara
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
            Modul Teori & Rambu Lalu Lintas
          </h1>
          <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1 max-w-2xl">
            Kurikulum resmi berbasis UU No. 22 Tahun 2009 tentang Lalu Lintas dan Angkutan Jalan (LLAJ). Baca modul sebelum menguji kemampuan di simulator 3D.
          </p>
        </div>

        {/* Quick Launch Simulator Button */}
        <button
          onClick={onOpenSimulator}
          className="self-start md:self-auto px-5 py-2.5 rounded-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-medium text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer shadow-sm"
        >
          <Compass className="w-4 h-4" />
          <span>Buka Simulator 3D</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
        {/* Category Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari teori rambu, kopling..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quick Visual Signs Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/70 dark:from-neutral-900 dark:via-blue-950/20 dark:to-neutral-900 p-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center lg:text-left">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Koleksi Rambu Lalu Lintas Esensial
            </h3>
            <p className="text-xs text-slate-600 dark:text-neutral-400 max-w-lg">
              Rambu-rambu ini wajib Anda kenali dan patuhi saat berkendara di simulasi maupun jalan raya.
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto py-1">
            <div className="flex flex-col items-center">
              <TrafficSignSvg type="curve-left" size={44} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 mt-1">Tikungan Kiri</span>
            </div>
            <div className="flex flex-col items-center">
              <TrafficSignSvg type="pedestrian" size={44} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 mt-1">Zebra Cross</span>
            </div>
            <div className="flex flex-col items-center">
              <TrafficSignSvg type="no-stopping" size={44} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 mt-1">Dilarang Stop</span>
            </div>
            <div className="flex flex-col items-center">
              <TrafficSignSvg type="no-parking" size={44} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 mt-1">Dilarang Parkir</span>
            </div>
            <div className="flex flex-col items-center">
              <TrafficSignSvg type="speed-40" size={44} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 mt-1">Batas 40 km/j</span>
            </div>
            <div className="flex flex-col items-center">
              <TrafficSignSvg type="turn-left-mandatory" size={44} />
              <span className="text-[10px] font-medium text-slate-600 dark:text-neutral-400 mt-1">Wajib Kiri</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Theory Articles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModules.map((module) => (
          <div
            key={module.id}
            onClick={() => onSelectModule(module)}
            className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-800 transition-all cursor-pointer flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 mb-3">
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {module.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{module.readTimeMinutes} menit</span>
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
                {module.title}
              </h3>

              <p className="text-xs text-slate-600 dark:text-neutral-300 line-clamp-3 leading-relaxed mb-4">
                {module.summary}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-neutral-200">
              <span className="group-hover:underline">Baca Modul Penuh</span>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
