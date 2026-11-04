"use client";

// Module-level shared flag between the 3D control-panel buttons (VRButton) and
// the input mapper (XRControlsMap). While a controller ray is hovering an
// interactive panel button, the trigger press is spent on *clicking* that
// button — so XRControlsMap suppresses the throttle for that frame, otherwise
// every panel click would also floor the gas pedal.
//
// A simple counter (not a boolean) so two buttons hovered simultaneously (one
// per hand) don't clear each other's flag.
let hoverCount = 0;

export const vrUiHover = {
  enter() {
    hoverCount++;
  },
  leave() {
    if (hoverCount > 0) hoverCount--;
  },
  get active() {
    return hoverCount > 0;
  },
};
