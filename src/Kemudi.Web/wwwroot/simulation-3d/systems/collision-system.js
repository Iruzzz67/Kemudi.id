/* Shared conservative swept OBB collision world. Metres, +Y up, local -Z forward. */
(function (root) {
  'use strict';
  const GAP = .002;
  const EPSILON = 1e-9;
  const finite = n => Number.isFinite(n);
  const angleDelta = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const position = p => ({ x: p.x, y: p.y || 0, z: p.z });
  const validPosition = p => p && finite(p.x) && finite(p.z) && (p.y === undefined || finite(p.y));
  function shapeOf(shape) {
    if (!shape || !finite(shape.width) || !finite(shape.length) || shape.width <= 0 || shape.length <= 0)
      throw new Error('Collision shape needs positive finite width and length');
    return { width: shape.width, length: shape.length, height: finite(shape.height) ? Math.max(.001, shape.height) : 2,
      kind: shape.kind || 'vehicle', offsetY: finite(shape.offsetY) ? shape.offsetY : 0 };
  }
  function axes(yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [{ x: c, z: -s }, { x: s, z: c }];
  }
  function radius(body, axis) {
    const [right, back] = axes(body.rotation);
    return Math.abs(right.x * axis.x + right.z * axis.z) * body.shape.width / 2
      + Math.abs(back.x * axis.x + back.z * axis.z) * body.shape.length / 2;
  }
  function footprintGap(a, b) {
    let largest = -Infinity, normal = null;
    for (const axis of [...axes(a.rotation), ...axes(b.rotation)]) {
      const distance = (b.position.x - a.position.x) * axis.x + (b.position.z - a.position.z) * axis.z;
      const gap = Math.abs(distance) - radius(a, axis) - radius(b, axis);
      if (gap > largest) { largest = gap; normal = { x: axis.x * Math.sign(distance || 1), z: axis.z * Math.sign(distance || 1) }; }
    }
    return { gap: largest, normal };
  }
  function verticallyOverlaps(a, b) {
    const ay = a.position.y + a.shape.offsetY, by = b.position.y + b.shape.offsetY;
    return ay + a.shape.height > by && by + b.shape.height > ay;
  }
  function overlaps(a, b) { return verticallyOverlaps(a, b) && footprintGap(a, b).gap < GAP; }
  function bounds(state) {
    const a = state.position, b = state.active ? state.target : a;
    const padding = Math.hypot(state.shape.width, state.shape.length) / 2 + GAP;
    return { minX: Math.min(a.x, b.x) - padding, maxX: Math.max(a.x, b.x) + padding,
      minZ: Math.min(a.z, b.z) - padding, maxZ: Math.max(a.z, b.z) + padding };
  }
  // Continuous SAT for translation. Each rotating OBB is enclosed by its starting
  // orientation expanded by radius*angle; this may stop early, never sweep through.
  function envelopeContactTime(a, b) {
    const da = a.active ? { x: a.target.x - a.position.x, y: a.target.y - a.position.y, z: a.target.z - a.position.z } : { x: 0, y: 0, z: 0 };
    const db = b.active ? { x: b.target.x - b.position.x, y: b.target.y - b.position.y, z: b.target.z - b.position.z } : { x: 0, y: 0, z: 0 };
    const angleA = a.active ? angleDelta(a.rotation, a.targetRotation) : 0;
    const angleB = b.active ? angleDelta(b.rotation, b.targetRotation) : 0;
    const angularPadding = Math.hypot(a.shape.width, a.shape.length) / 2 * Math.min(Math.abs(angleA), 2)
      + Math.hypot(b.shape.width, b.shape.length) / 2 * Math.min(Math.abs(angleB), 2);
    const rv = { x: db.x - da.x, y: db.y - da.y, z: db.z - da.z };
    const actualGap = footprintGap(a, b);
    if (angularPadding < EPSILON && actualGap.gap > -GAP
      && rv.x * actualGap.normal.x + rv.z * actualGap.normal.z > EPSILON) return null;
    let enter = 0, exit = 1;
    const tests = [...axes(a.rotation), ...axes(b.rotation)].map(axis => ({
      distance: (b.position.x - a.position.x) * axis.x + (b.position.z - a.position.z) * axis.z,
      velocity: rv.x * axis.x + rv.z * axis.z,
      extent: radius(a, axis) + radius(b, axis) + angularPadding + GAP,
    }));
    tests.push({ distance: b.position.y + b.shape.offsetY + b.shape.height / 2 - a.position.y - a.shape.offsetY - a.shape.height / 2,
      velocity: rv.y, extent: (a.shape.height + b.shape.height) / 2 });
    for (const { distance, velocity, extent } of tests) {
      if (Math.abs(velocity) < EPSILON) {
        if (Math.abs(distance) >= extent) return null;
      } else {
        let lo = (-extent - distance) / velocity, hi = (extent - distance) / velocity;
        if (lo > hi) [lo, hi] = [hi, lo];
        enter = Math.max(enter, lo); exit = Math.min(exit, hi);
        if (enter > exit || exit < 0 || enter > 1) return null;
      }
    }
    return exit <= EPSILON ? null : Math.max(0, enter);
  }
  // A whole-tick angular envelope can overlap a nearby wall even when every
  // actual pose moves away. Refine only candidate hits into smaller conservative
  // sweeps, never accepting a path merely because its endpoint is clear.
  function contactTime(a, b, depth = 0) {
    const candidate = envelopeContactTime(a, b);
    if (candidate === null || depth >= 8) return candidate;
    const rotating = [a, b].some(body => body.active
      && Math.abs(angleDelta(body.rotation, body.targetRotation)) > EPSILON);
    if (!rotating) return candidate;
    const interval = (body, start, end) => {
      if (!body.active) return body;
      const delta = angleDelta(body.rotation, body.targetRotation);
      const at = t => ({ x: body.position.x + (body.target.x - body.position.x) * t,
        y: body.position.y + (body.target.y - body.position.y) * t,
        z: body.position.z + (body.target.z - body.position.z) * t });
      return { ...body, position: at(start), target: at(end),
        rotation: body.rotation + delta * start, targetRotation: body.rotation + delta * end };
    };
    const first = contactTime(interval(a, 0, .5), interval(b, 0, .5), depth + 1);
    if (first !== null) return first * .5;
    const second = contactTime(interval(a, .5, 1), interval(b, .5, 1), depth + 1);
    return second === null ? null : .5 + second * .5;
  }
  class CollisionWorld {
    constructor({ cellSize = 12 } = {}) {
      this.cellSize = finite(cellSize) && cellSize > 0 ? cellSize : 12;
      this.bodies = new Map();
      this.staticBodies = new Map();
    }
    registerBody(id, entity, shape = entity?.config?.dimensions) {
      if (!id || this.bodies.has(id) || this.staticBodies.has(id)) throw new Error('Duplicate or missing collision body ID');
      if (!validPosition(entity?.position)) throw new Error('Collision body needs a finite position');
      this.bodies.set(id, { id, entity, shape: shapeOf(shape) });
      return entity;
    }
    registerStaticBox(id, min, max) {
      if (!validPosition(min) || !validPosition(max) || max.x <= min.x || max.z <= min.z || max.y <= min.y)
        throw new Error('Static collision box needs finite ordered bounds');
      if (!id || this.bodies.has(id) || this.staticBodies.has(id)) throw new Error('Duplicate or missing collision body ID');
      this.staticBodies.set(id, { id, position: { x: (min.x + max.x) / 2, y: min.y, z: (min.z + max.z) / 2 },
        rotation: 0, shape: shapeOf({ width: max.x - min.x, length: max.z - min.z, height: max.y - min.y, kind: 'static' }) });
    }
    unregisterBody(id) { this.bodies.delete(id); this.staticBodies.delete(id); }
    _current(body) {
      return body.entity ? { id: body.id, entity: body.entity, shape: body.shape,
        position: position(body.entity.position), rotation: finite(body.entity.rotation) ? body.entity.rotation : 0 } : { ...body };
    }
    canSpawn(pose, shape, ignoreId = null) {
      const p = pose.position || pose;
      if (!validPosition(p) || (pose.rotation !== undefined && !finite(pose.rotation))) return false;
      const candidate = { position: position(p), rotation: pose.rotation || 0, shape: shapeOf(shape) };
      for (const body of [...this.bodies.values(), ...this.staticBodies.values()])
        if (body.id !== ignoreId && overlaps(candidate, this._current(body))) return false;
      return true;
    }
    getLeadObstacle(id, maxDistance = 80) {
      const own = this.bodies.get(id);
      if (!own) return null;
      const a = this._current(own), forward = { x: -Math.sin(a.rotation), z: -Math.cos(a.rotation) }, left = { x: -forward.z, z: forward.x };
      let best = null;
      for (const body of [...this.bodies.values(), ...this.staticBodies.values()]) {
        if (body.id === id) continue;
        const b = this._current(body);
        if (!verticallyOverlaps(a, b)) continue;
        const dx = b.position.x - a.position.x, dz = b.position.z - a.position.z;
        const along = dx * forward.x + dz * forward.z;
        if (along <= 0 || Math.abs(dx * left.x + dz * left.z) > a.shape.width / 2 + radius(b, left) + .1) continue;
        const distance = Math.max(0, along - a.shape.length / 2 - radius(b, forward));
        if (distance <= maxDistance && (!best || distance < best.distance)) {
          const headingDot = Math.cos(a.rotation - b.rotation);
          best = { id: b.id, entity: b.entity, position: b.position, distance, gap: distance,
            speed: finite(b.entity?.speed) ? b.entity.speed * headingDot : 0, headingDot, kind: b.shape.kind };
        }
      }
      return best;
    }
    _pairs(states) {
      const cells = new Map(), pairs = new Map();
      states.forEach((state, index) => {
        const box = bounds(state), size = this.cellSize;
        for (let x = Math.floor(box.minX / size); x <= Math.floor(box.maxX / size); x++)
          for (let z = Math.floor(box.minZ / size); z <= Math.floor(box.maxZ / size); z++) {
            const key = x + ':' + z, occupants = cells.get(key) || [];
            for (const other of occupants) {
              if (!state.active && !states[other].active) continue;
              pairs.set(other + ':' + index, [states[other], state]);
            }
            occupants.push(index); cells.set(key, occupants);
          }
      });
      return pairs.values();
    }
    resolve(proposals = [], dt = 1 / 60) {
      const requested = new Map(proposals.map(p => [p.id, p]));
      const duration = finite(dt) && dt > 0 ? dt : 0;
      const states = [...this.bodies.values(), ...this.staticBodies.values()].map(body => {
        const state = this._current(body), proposal = requested.get(body.id);
        state.start = { ...state.position }; state.startRotation = state.rotation;
        state.target = { ...state.position }; state.targetRotation = state.rotation;
        state.blocked = false; state.contactId = null; state.contactKind = null;
        if (proposal && duration > 0) {
          const target = proposal.position;
          const valid = validPosition(target) && finite(proposal.rotation ?? state.rotation)
            && Math.hypot(target.x - state.position.x, target.z - state.position.z) <= 512;
          if (valid) { state.target = position(target); state.targetRotation = proposal.rotation ?? state.rotation; }
          else { state.blocked = true; state.contactKind = 'invalid'; }
        }
        state.active = !!proposal && duration > 0 && !state.blocked && (
          Math.hypot(state.target.x - state.position.x, state.target.y - state.position.y, state.target.z - state.position.z) > EPSILON
          || Math.abs(angleDelta(state.rotation, state.targetRotation)) > EPSILON);
        return state;
      });
      // Each contact stops at least one actor. Advance every other actor on the
      // same time line, then recompute against the newly stationary obstacle.
      for (let event = 0; event <= this.bodies.size; event++) {
        let earliest = 1, hit = null;
        for (const pair of this._pairs(states)) {
          const time = contactTime(...pair);
          if (time !== null && (time < earliest || !hit)) { earliest = time; hit = pair; }
        }
        const fraction = hit ? Math.max(0, earliest - 1e-7) : 1;
        for (const state of states) if (state.active) {
          state.position.x += (state.target.x - state.position.x) * fraction;
          state.position.y += (state.target.y - state.position.y) * fraction;
          state.position.z += (state.target.z - state.position.z) * fraction;
          state.rotation += angleDelta(state.rotation, state.targetRotation) * fraction;
        }
        if (!hit) break;
        for (let i = 0; i < 2; i++) {
          const state = hit[i], other = hit[1 - i];
          if (state.active) {
            state.active = false; state.blocked = true;
            state.contactId = other.id; state.contactKind = other.shape.kind;
          }
        }
      }
      const results = new Map();
      for (const state of states) if (state.entity) {
        const dx = state.position.x - state.start.x, dz = state.position.z - state.start.z;
        const distance = Math.hypot(dx, dz), forwardDot = -dx * Math.sin(state.rotation) - dz * Math.cos(state.rotation);
        const travelSpeed = duration > 0 ? Math.sign(forwardDot) * distance / duration : 0;
        results.set(state.id, { position: state.position, rotation: state.rotation, speed: state.blocked ? 0 : travelSpeed,
          travelSpeed, distance, blocked: state.blocked, contactId: state.contactId, contactKind: state.contactKind });
      }
      return results;
    }
    dispose() { this.bodies.clear(); this.staticBodies.clear(); }
  }
  root.CollisionWorld = CollisionWorld;
})(window);
