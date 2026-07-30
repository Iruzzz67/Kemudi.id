"use client";

import { useSimStore } from "@/store/simStore";
import { VEHICLES } from "@/lib/vehicles";
import { HANDLING_GROUPS, mergeHandling } from "@/lib/handling";

export function HandlingSettingsPanel({ onClose }: { onClose: () => void }) {
  const vehicle = useSimStore((s) => s.vehicle);
  const overrides = useSimStore((s) => s.handlingOverrides[vehicle]);
  const setHandlingParam = useSimStore((s) => s.setHandlingParam);
  const resetHandling = useSimStore((s) => s.resetHandling);

  const base = VEHICLES[vehicle];
  const effective = mergeHandling(base, overrides);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Pengaturan Handling</h2>
            <p className="text-sm text-neutral-500">Kendaraan: {base.label}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            Tutup
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {HANDLING_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                {group.title}
              </h3>
              <div className="mt-2 space-y-4">
                {group.params.map((param) => {
                  const rawValue = effective[param.key] as number;
                  const displayValue = param.toDisplay ? param.toDisplay(rawValue) : rawValue;
                  return (
                    <div key={param.key}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{param.label}</span>
                        <span className="tabular-nums text-neutral-500">
                          {displayValue}
                          {param.unit ? ` ${param.unit}` : ""}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={displayValue}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          const stored = param.fromDisplay ? param.fromDisplay(v) : v;
                          setHandlingParam(vehicle, param.key, stored);
                        }}
                        className="mt-1 w-full accent-blue-600"
                      />
                      {param.note && (
                        <p className="mt-0.5 text-xs text-neutral-400">{param.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              VR Steering
            </h3>
            <div className="mt-2 rounded-lg border border-dashed border-neutral-300 p-3 text-xs text-neutral-400 dark:border-neutral-700">
              Steering Smoothing, Input Filter, Max Rotation, Steering Assist, dan Auto Center
              khusus untuk hardware setir/VR. Kemudi.id memakai kontrol keyboard, jadi pengaturan
              ini belum berlaku di sini.
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={() => resetHandling(vehicle)}
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Reset ke Default
          </button>
          <button
            onClick={onClose}
            className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
