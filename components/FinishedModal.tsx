import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { SimulationResult, VehicleSpec } from '@/types/ui';
import { Award, AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';

interface FinishedModalProps {
  isOpen: boolean;
  result: SimulationResult;
  vehicleSpec: VehicleSpec;
  onRetry: () => void;
  onSaveToDashboard: () => void;
  onChangeVehicle: () => void;
}

export const FinishedModal: React.FC<FinishedModalProps> = ({
  isOpen,
  result,
  onRetry,
  onSaveToDashboard,
  onChangeVehicle,
}) => {
  useEffect(() => {
    if (isOpen && result.passed && result.score >= 80) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [isOpen, result.passed, result.score]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-neutral-800 shadow-2xl text-slate-900 dark:text-white space-y-6">
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div
            className={`w-16 h-16 rounded-3xl mx-auto flex items-center justify-center shadow-md ${
              result.passed
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
            }`}
          >
            {result.passed ? <Award className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
          </div>

          <h3 className="text-2xl font-extrabold tracking-tight">
            {result.passed ? 'Selamat! Anda Dinyatakan Lulus' : 'Perlu Latihan Ulang'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-sm mx-auto">
            {result.passed
              ? 'Anda berhasil menyelesaikan trek simulasi dengan kontrol kendaraan yang aman dan tertib.'
              : 'Masih terdapat beberapa pelanggaran rambu atau rintangan yang perlu diperbaiki.'}
          </p>
        </div>

        {/* Big Score Display */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800 text-center">
          <div className="text-xs text-slate-400 uppercase font-semibold">Skor Akhir Simulasi</div>
          <div className="text-5xl font-black my-1 tabular-nums font-mono text-blue-600 dark:text-blue-400">
            {result.score}
            <span className="text-lg text-slate-400 font-normal"> / 100</span>
          </div>
          <div className="text-xs font-semibold">
            Status:{' '}
            <span className={result.passed ? 'text-emerald-500' : 'text-amber-500'}>
              {result.passed ? 'KOMPETEN (LULUS)' : 'BELUM KOMPETEN (REMEDIAL)'}
            </span>
          </div>
        </div>

        {/* Penalty & Metrics Breakdown */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
            <span className="text-slate-400 block text-[11px]">Waktu Tempuh:</span>
            <span className="font-bold text-slate-800 dark:text-white tabular-nums">
              {result.durationSeconds} Detik
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
            <span className="text-slate-400 block text-[11px]">Pelanggaran Rambu:</span>
            <span
              className={`font-bold tabular-nums ${
                result.violationsCount > 0 ? 'text-red-500' : 'text-emerald-500'
              }`}
            >
              {result.violationsCount} Insiden
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
            <span className="text-slate-400 block text-[11px]">Keluar Lajur Aspal:</span>
            <span className="font-bold text-slate-800 dark:text-white tabular-nums">
              {result.offRoadCount} Kali
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-neutral-950 border border-slate-100 dark:border-neutral-800">
            <span className="text-slate-400 block text-[11px]">Rintangan Cone Kena:</span>
            <span
              className={`font-bold tabular-nums ${
                result.obstacleHits > 0 ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              {result.obstacleHits} Kali
            </span>
          </div>
        </div>

        {/* Violation Notes if any */}
        {result.violationDetails.length > 0 && (
          <div className="p-3 rounded-xl bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-300">
            <div className="font-bold mb-1">Catatan Evaluasi Instruktur:</div>
            <ul className="list-disc pl-5 space-y-0.5">
              {result.violationDetails.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={onSaveToDashboard}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Simpan Hasil & Lihat Dashboard Siswa</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onRetry}
              className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Coba Latihan Lagi</span>
            </button>
            <button
              onClick={onChangeVehicle}
              className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <span>Ganti Kendaraan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
