(function (root) {
  'use strict';
  const clamp = (v, lo, hi, fallback = 0) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
  function normalizeStick(raw, deadzone = .12, exponent = 1.4) {
    const v = clamp(raw, -1, 1), dz = clamp(deadzone, 0, .5, .12);
    return Math.abs(v) <= dz ? 0 : Math.sign(v) * ((Math.abs(v) - dz) / (1 - dz)) ** clamp(exponent, .5, 4, 1.4);
  }
  function normalizeTrigger(button, deadzone = .03, exponent = 1) {
    const v = clamp(Number.isFinite(button?.value) ? button.value : button?.pressed === true ? 1 : 0, 0, 1);
    const dz = clamp(deadzone, 0, .5, .03);
    return v <= dz ? 0 : ((v - dz) / (1 - dz)) ** clamp(exponent, .5, 4, 1);
  }
  const hysteresis = (value, previous) => Number.isFinite(value) && (previous ? value > .40 : value >= .55);
  root.GamepadNormalize = Object.freeze({ clamp, normalizeStick, normalizeTrigger, hysteresis,
    risingEdge: (now, before) => !!now && !before, fallingEdge: (now, before) => !now && !!before });
})(window);
