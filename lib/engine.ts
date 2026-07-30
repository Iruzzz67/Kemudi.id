export type EngineState = "OFF" | "ACC" | "ON" | "START";

/** How long the key stays in the spring-loaded START position before the engine catches. */
export const CRANK_DURATION_MS = 1100;

/**
 * One step of a real ignition switch: OFF -> ACC -> ON -> START (crank) -> ON
 * (running). Pressing again while running turns the engine back off. While
 * cranking (START) the switch is busy and further presses are ignored until
 * the crank timer resolves it back to ON.
 */
export function nextIgnitionStep(
  state: EngineState,
  running: boolean
): { state: EngineState; running: boolean } | null {
  if (state === "OFF") return { state: "ACC", running: false };
  if (state === "ACC") return { state: "ON", running: false };
  if (state === "ON" && !running) return { state: "START", running: false };
  if (state === "ON" && running) return { state: "OFF", running: false };
  return null;
}
