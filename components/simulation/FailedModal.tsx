import React from 'react';
import { ShieldAlert, RotateCcw, BookOpen, AlertOctagon } from 'lucide-react';

interface FailedModalProps {
  isOpen: boolean;
  onRetry: () => void;
  onOpenTheory: () => void;
}

export const FailedModal: React.FC<FailedModalProps> = ({ isOpen, onRetry, onOpenTheory }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-red-500/40 shadow-2xl text-slate-900 dark:text-white space-y-5 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center shadow-md animate-pulse">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-extrabold tracking-tight text-red-600 dark:text-red-500">
            Simulasi Dihentikan!
          </h3>
          <p className="text-xs text-slate-600 dark:text-neutral-300 font-semibold">
            Pelanggaran Fatal: Menabrak Pejalan Kaki pada Penyeberangan Zebra Cross
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-red-50 dark:bg-neutral-950 border border-red-200 dark:border-neutral-800 text-left text-xs text-slate-700 dark:text-neutral-300 leading-relaxed space-y-2">
          <div className="font-bold text-red-700 dark:text-red-400">
            UU No. 22 Tahun 2009 Pasal 106 Ayat 2:
          </div>
          <p>
            &ldquo;Setiap pengemudi kendaraan bermotor di jalan wajib mengutamakan keselamatan pejalan kaki dan pesepeda.&rdquo;
          </p>
          <p className="text-[11px] text-slate-500 dark:text-neutral-400">
            Ketika mendekati rambu atau marka penyeberangan pejalan kaki, pengemudi wajib mengurangi kecepatan dan menghentikan kendaraan secara penuh jika ada orang yang menyeberang.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onRetry}
            className="w-full py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Mulai Ulang Simulasi dari Garis Awal</span>
          </button>

          <button
            onClick={onOpenTheory}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Pelajari Teori Rambu & Etika Jalan Raya</span>
          </button>
        </div>
      </div>
    </div>
  );
};
