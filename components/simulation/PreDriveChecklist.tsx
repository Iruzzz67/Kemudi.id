"use client";

import { useSimStore } from "@/store/simStore";
import { getChecklistItems } from "@/lib/checklist";

// Plain (non-positioned) card — Hud.tsx stacks this under the speed/gear card
// inside a shared top-left column, per the spec's "checklist tampil pada sisi
// kiri layar, tercentang otomatis ketika dilakukan."
export function PreDriveChecklist() {
  const transmissionMode = useSimStore((s) => s.transmissionMode);
  const vehicleType = useSimStore((s) => s.vehicle);
  const engineRunning = useSimStore((s) => s.engineRunning);
  const handbrakeOn = useSimStore((s) => s.handbrakeOn);
  const seatbeltOn = useSimStore((s) => s.seatbeltOn);
  const seatAdjusted = useSimStore((s) => s.seatAdjusted);
  const mirrorAdjusted = useSimStore((s) => s.mirrorAdjusted);
  const hasClutchedOnce = useSimStore((s) => s.hasClutchedOnce);
  const hasEngagedGearOne = useSimStore((s) => s.hasEngagedGearOne);
  const turnSignalUsedOnce = useSimStore((s) => s.turnSignalUsedOnce);
  const helmetOn = useSimStore((s) => s.helmetOn);
  const jacketOn = useSimStore((s) => s.jacketOn);
  const glovesOn = useSimStore((s) => s.glovesOn);
  const bootsOn = useSimStore((s) => s.bootsOn);

  const items = getChecklistItems(
    {
      engineRunning,
      handbrakeOn,
      seatbeltOn,
      seatAdjusted,
      mirrorAdjusted,
      hasClutchedOnce,
      hasEngagedGearOne,
      turnSignalUsedOnce,
      helmetOn,
      jacketOn,
      glovesOn,
      bootsOn,
    },
    transmissionMode,
    vehicleType
  );

  return (
    <div className="w-60 rounded-lg bg-black/60 px-3 py-3 text-white backdrop-blur">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
        Pemeriksaan Pra-Jalan
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] leading-none ${
                item.done ? "border-emerald-400 bg-emerald-500/80" : "border-white/40"
              }`}
            >
              {item.done ? "✓" : ""}
            </span>
            <span className={item.done ? "text-white/50 line-through" : "text-white/90"}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
