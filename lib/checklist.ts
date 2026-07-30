import { TransmissionMode } from "@/store/simStore";

export type ChecklistState = {
  engineRunning: boolean;
  handbrakeOn: boolean;
  seatbeltOn: boolean;
  seatAdjusted: boolean;
  mirrorAdjusted: boolean;
  hasClutchedOnce: boolean;
  hasEngagedGearOne: boolean;
  turnSignalUsedOnce: boolean;
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
  transmissionMode: TransmissionMode
): ChecklistItem[] {
  const items: ChecklistItem[] = [
    { label: "Masuk kendaraan", done: true },
    { label: "Tutup pintu", done: true },
    { label: "Atur kursi", done: state.seatAdjusted },
    { label: "Atur spion", done: state.mirrorAdjusted },
    { label: "Pasang sabuk pengaman", done: state.seatbeltOn },
    { label: "Nyalakan mesin", done: state.engineRunning },
    { label: "Lepaskan rem tangan", done: !state.handbrakeOn },
  ];

  if (transmissionMode === "manual") {
    items.push({ label: "Injak kopling", done: state.hasClutchedOnce });
    items.push({ label: "Masukkan gigi satu", done: state.hasEngagedGearOne });
  } else {
    items.push({ label: "Masukkan gigi satu", done: state.engineRunning });
  }

  items.push({ label: "Nyalakan lampu sein bila diperlukan", done: state.turnSignalUsedOnce });

  return items;
}
