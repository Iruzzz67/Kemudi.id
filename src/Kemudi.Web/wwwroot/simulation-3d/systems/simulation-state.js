/* Shared registry and simulation clock. Coordinates: metres, +Y up, -Z forward. */
(function (root) {
  'use strict';
  class SimulationState {
    constructor() {
      this.vehicles = new Map();
      this.clock = { elapsed: 0, tick: 0, fixedDt: 1 / 60 };
      this.environment = null;
    }
    register(vehicle) {
      if (!vehicle.id || this.vehicles.has(vehicle.id)) throw new Error('Duplicate or missing vehicle ID');
      this.vehicles.set(vehicle.id, vehicle);
      return vehicle;
    }
    unregister(id) { this.vehicles.delete(id); }
    getVehicles() { return [...this.vehicles.values()]; }
    getPlayerVehicle() { return this.vehicles.get('player') || null; }
    getEnvironment() { return this.environment?.getState() || null; }
    getClock() { return this.clock; }
    step() { this.clock.tick++; this.clock.elapsed = this.clock.tick * this.clock.fixedDt; }
    resetClock() { this.clock.tick = 0; this.clock.elapsed = 0; }
  }
  root.SimulationState = SimulationState;
})(window);
