/* One committed snapshot is consumed by both HUD and the cockpit cluster. */
(function (root) {
  'use strict';
  const InstrumentSystem = {
    snapshotFromVehicle(vehicle, environment = {}) {
      const speedKmh = Number.isFinite(vehicle.speed) ? Math.abs(vehicle.speed) * 3.6 : 0;
      const lights = vehicle.lightState || {
        lowBeam: !!vehicle.lightsOn, highBeam: !!vehicle.highBeamOn,
        left: !!vehicle.signalLeft, right: !!vehicle.signalRight,
        hazard: !!vehicle.hazardOn, blink: vehicle.signalTime % .8 < .4,
        brake: !!vehicle.braking || !!vehicle.handbrakeOn, reverse: vehicle.gear === -1,
      };
      return Object.freeze({
        speedKmh, speedText: String(Math.round(speedKmh)),
        gear: vehicle.gear === -1 ? 'R' : vehicle.gear === 0 ? 'N' : String(vehicle.gear),
        engineOn: !!vehicle.engineOn, handbrakeOn: !!vehicle.handbrakeOn,
        braking: !!vehicle.braking, lights: Object.freeze({ ...lights }),
        timeOfDay: environment.timeOfDay || 'siang', weather: environment.weather || 'off',
      });
    },
  };
  root.InstrumentSystem = InstrumentSystem;
})(window);
