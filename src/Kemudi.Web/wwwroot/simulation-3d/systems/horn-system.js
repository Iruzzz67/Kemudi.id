/* Simulation-clock cooldown; audio owns the shared context and global voice limit. */
(function (root) {
  'use strict';
  class HornSystem {
    constructor(audio) { this.audio = audio; this.lastPlayed = new Map(); this.disposed = false; }
    trigger(vehicle, clockSeconds) {
      if (this.disposed || !vehicle?.id || !Number.isFinite(clockSeconds)) return false;
      const cooldown = vehicle.id === 'player' ? .55 : 3;
      const previous = this.lastPlayed.get(vehicle.id);
      if (previous !== undefined && clockSeconds >= previous && clockSeconds - previous < cooldown) return false;
      if (!this.audio.playHorn(vehicle.type)) return false;
      this.lastPlayed.set(vehicle.id, clockSeconds);
      return true;
    }
    unregisterVehicle(id) { this.lastPlayed.delete(id); }
    dispose() { this.lastPlayed.clear(); this.disposed = true; }
  }
  root.HornSystem = HornSystem;
})(window);
