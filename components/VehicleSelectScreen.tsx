import React from 'react';
import { VEHICLE_SPECS } from '@/data/mockData';
import { TransmissionType, VehicleType } from '@/types/ui';
import { Car, Bike, Truck, Play, Check, ShieldCheck, Sparkles } from 'lucide-react';

interface VehicleSelectScreenProps {
  selectedVehicle: VehicleType;
  setSelectedVehicle: (v: VehicleType) => void;
  transmission: TransmissionType;
  setTransmission: (t: TransmissionType) => void;
  startWithWalking: boolean;
  setStartWithWalking: (val: boolean) => void;
  onLaunchSimulation: () => void;
}

export const VehicleSelectScreen: React.FC<VehicleSelectScreenProps> = ({
  selectedVehicle,
  setSelectedVehicle,
  transmission,
  setTransmission,
  startWithWalking,
  setStartWithWalking,
  onLaunchSimulation,
}) => {
  const getIcon = (type: VehicleType) => {
    switch (type) {
      case 'motor':
        return <Bike className="w-6 h-6" />;
      case 'truk':
        return <Truck className="w-6 h-6" />;
      default:
        return <Car className="w-6 h-6" />;
    }
  };

  const currentSpec = VEHICLE_SPECS[selectedVehicle];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Simulator 3D Interaktif
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Pilih Kendaraan & Mode Transmisi
        </h1>
        <p className="text-sm text-slate-600 dark:text-neutral-400 max-w-xl mx-auto">
          Uji pemahaman rambu, kendali kopling, dan jarak pengereman di lintasan 3D berstandar ujian SIM.
        </p>
      </div>

      {/* 3 Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(VEHICLE_SPECS).map((spec) => {
          const isSelected = selectedVehicle === spec.id;
          return (
            <div
              key={spec.id}
              onClick={() => setSelectedVehicle(spec.id)}
              className={`rounded-2xl border p-6 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-600 dark:ring-blue-500 shadow-md'
                  : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: spec.color }}
                  >
                    {getIcon(spec.id)}
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                      {spec.licenseType}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {spec.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400 line-clamp-3 leading-relaxed mb-4">
                  {spec.description}
                </p>

                <div className="space-y-1.5 text-xs py-3 border-t border-slate-100 dark:border-neutral-800/80">
                  <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                    <span>Maks Kecepatan:</span>
                    <strong className="text-slate-900 dark:text-white tabular-nums">
                      {spec.topSpeed} km/j
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-neutral-400">
                    <span>Tingkat Kesulitan:</span>
                    <strong className="text-slate-900 dark:text-white">{spec.difficulty}</strong>
                  </div>
                </div>
              </div>

              <div
                className={`mt-4 py-2 px-3 rounded-xl text-center text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                }`}
              >
                {isSelected ? '✓ Kendaraan Terpilih' : 'Pilih Kendaraan'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Options Panel: Transmission & Walking Phase */}
      <div className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transmission Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-2">
              Jenis Transmisi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTransmission('otomatis')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  transmission === 'otomatis'
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600 font-bold'
                    : 'border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-sm font-bold">Otomatis (Matic)</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                  Tinggal gas & rem, perpindahan gigi diatur komputer
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTransmission('manual')}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  transmission === 'manual'
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600 font-bold'
                    : 'border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-sm font-bold">Manual (Kopling)</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                  Injak [Shift] sebelum ganti gigi [E/Q], latihan titik gigit
                </div>
              </button>
            </div>
          </div>

          {/* Simulation Mode Toggle (Walking phase vs Direct drive) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-neutral-300 mb-2">
              Fase Awal Simulasi
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStartWithWalking(true)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  startWithWalking
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600 font-bold'
                    : 'border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-sm font-bold">Mulai Berjalan Kaki</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                  Berjalan mendekati pintu kendaraan di area parkir
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStartWithWalking(false)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                  !startWithWalking
                    ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 ring-1 ring-blue-600 font-bold'
                    : 'border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300'
                }`}
              >
                <div className="text-sm font-bold">Langsung di Kabin</div>
                <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                  Langsung berada di balik kemudi siap menjalankan mesin
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Skor latihan akan otomatis dicatat ke riwayat Dashboard Siswa.</span>
          </div>

          <button
            onClick={onLaunchSimulation}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition hover:shadow-md cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Mulai Simulasi {currentSpec.name}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
