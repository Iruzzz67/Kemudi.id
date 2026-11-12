(function (root) {
  'use strict';
  const bindings = Object.freeze({ interact: 0, horn: 1, ignition: 2, camera: 3,
    signalLeft: 4, signalRight: 5, brake: 6, throttle: 7, menu: 8, pause: 9,
    clutch: 10, hazard: 11, lights: 12, handbrake: 13, gearDown: 14, gearUp: 15 });
  root.GamepadMappings = Object.freeze({ bindings, profile: 'standard-default-v1' });
})(window);
