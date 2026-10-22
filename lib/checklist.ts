import { TransmissionMode } from "@/store/simStore";
import { VehicleType } from "@/lib/vehicles";

export type ChecklistState = {
  engineRunning: boolean;
  handbrakeOn: boolean;
  seatbeltOn: boolean;
  seatAdjusted: boolean;
  mirrorAdjusted: boolean;
  hasClutchedOnce: boolean;
  hasEngagedGearOne: boolean;
  turnSignalUsedOnce: boolean;
  helmetOn: boolean;
  jacketOn: boolean;
  glovesOn: boolean;
  bootsOn: boolean;
};

export type ChecklistItem = { label: string; done: boolean };

/**
 * Single source of truth for the pre-drive checklist, per the spec's list —
 * automatic transmission has no clutch pedal, so "Injak kopling" is dropped
 * and "Masukkan gigi satu" auto-ticks once the engine is running instead of
 * waiting on a manual gear selection that doesn't exist in that mode.
 */
export function getChecklistItems(
  state: ChecklistState,
  transmissionMode: TransmissionMode,
  vehicleType: VehicleType
): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { label: "Masuk kendaraan", done: true },
    { label: "Tutup pintu", done: true },
  ];

  if (vehicleType === "MOTOR") {
    items.push({ label: "Pakai helm", done: state.helmetOn });
    items.push({ label: "Pakai jaket", done: state.jacketOn });
    items.push({ label: "Pakai sarung tangan", done: state.glovesOn });
    items.push({ label: "Pakai sepatu", done: state.bootsOn });
  } else {
    items.push({ label: "Atur kursi", done: state.seatAdjusted });
    items.push({ label: "Atur spion", done: state.mirrorAdjusted });
    items.push({ label: "Pasang sabuk pengaman", done: state.seatbeltOn });
  }

  items.push({ label: "Nyalakan mesin", done: state.engineRunning });
  items.push({ label: "Lepaskan rem tangan", done: !state.handbrakeOn });

  if (transmissionMode === "manual") {
    items.push({ label: "Injak kopling", done: state.hasClutchedOnce });
    items.push({ label: "Masukkan gigi satu", done: state.hasEngagedGearOne });
  } else {
    items.push({ label: "Masukkan gigi satu", done: state.engineRunning });
  }

  items.push({ label: "Nyalakan lampu sein bila diperlukan", done: state.turnSignalUsedOnce });

  return items;
}
