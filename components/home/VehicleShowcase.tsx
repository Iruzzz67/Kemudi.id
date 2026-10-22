import React from 'react';
import { VEHICLE_SPECS } from '@/data/mockData';
import { VehicleType } from '@/types/ui';
import { Car, Bike, Truck, ArrowRight, Gauge, Shield, Wrench } from 'lucide-react';

interface VehicleShowcaseProps {
  onSelectVehicleToDrive: (type: VehicleType) => void;
}

export const VehicleShowcase: React.FC<VehicleShowcaseProps> = ({ onSelectVehicleToDrive }) => {
  const getVehicleIcon = (type: VehicleType) => {
    switch (type) {
      case 'motor':
        return <Bike className="w-6 h-6" />;
      case 'truk':
        return <Truck className="w-6 h-6" />;
      default:
        return <Car className="w-6 h-6" />;
    }
  };

  return (
    <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Pilihan Kendaraan Latihan
        </h2>
        <p className="mt-3 text-slate-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed">
          Setiap kendaraan memiliki karakteristik dinamika kemudi, radius putar, dan visibilitas yang berbeda. Mulai latihan Anda pada simulator 3D realistis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.values(VEHICLE_SPECS).map((spec) => (
          <div
            key={spec.id}
            className="rounded-2xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              {/* Header with Icon & License */}
              <div className="flex items-center justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: spec.color }}
                >
                  {getVehicleIcon(spec.id)}
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                    {spec.licenseType}
                  </span>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-500 mt-1">
                    Tingkat: {spec.difficulty}
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {spec.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium mb-3">
                {spec.category}
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-300 leading-relaxed mb-6">
                {spec.description}
              </p>

              {/* Specs bars */}
              <div className="space-y-3 mb-6 bg-slate-50 dark:bg-neutral-950/60 p-3.5 rounded-xl border border-slate-100 dark:border-neutral-800/80">
                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-neutral-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5" /> Kecepatan Maksimum
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {spec.topSpeed} km/j
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(spec.topSpeed / 160) * 100}%`,
                        backgroundColor: spec.color,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-neutral-400 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Kemudahan Manuver
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                      {spec.turnRadius}/10
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${spec.turnRadius * 10}%`,
                        backgroundColor: spec.color,
                      }}
                    />
                  </div>
                </div>

                <div className="pt-1 text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
                  <span>Dukungan Transmisi:</span>
                  <span className="font-medium text-slate-700 dark:text-neutral-200 capitalize">
                    {spec.transmissionSupport.join(' & ')}
                  </span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => onSelectVehicleToDrive(spec.id)}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-neutral-700 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-slate-800 dark:text-neutral-200 font-medium text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Latihan {spec.name.split(' ')[0]} di Simulator</span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
