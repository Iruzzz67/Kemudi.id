// Module-level shared edge queue between InputManager (writer) and
// VehicleController (reader) — the same pattern uiHover.ts uses for the VR UI
// hover flag. Gear shifts can't be dispatched to the store by InputManager
// because the clutch-gating / over-rev / stall logic lives inside
// VehicleController's physics loop (it needs gear/speed refs every frame), so
// instead the InputManager deposits the "wants a shift" edge here and
// VehicleController consumes it with Set.delete().
export const vehicleGearEdges = new Set<"gearUp" | "gearDown" | "reverse" | "neutral">();
