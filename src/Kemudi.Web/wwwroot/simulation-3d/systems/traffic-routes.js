/* Route adapters for the existing unified map, never an independent road layout. */
(function (root) {
  'use strict';
  const UP = new THREE.Vector3(0, 1, 0);
  class RoutePath {
    constructor(id, points) {
      this.id = id;
      this.points = points.filter((p, i) => !i || p.distanceToSquared(points[i - 1]) > 1e-8);
      this.distances = [0];
      for (let i = 1; i < this.points.length; i++)
        this.distances.push(this.distances[i - 1] + this.points[i].distanceTo(this.points[i - 1]));
      this.length = this.distances[this.distances.length - 1];
      this.gates = [];
    }
    _position(s) {
      s = THREE.MathUtils.clamp(s, 0, this.length);
      let lo = 0, hi = this.distances.length - 1;
      while (lo + 1 < hi) {
        const mid = (lo + hi) >> 1;
        if (this.distances[mid] <= s) lo = mid; else hi = mid;
      }
      const span = this.distances[hi] - this.distances[lo];
      return this.points[lo].clone().lerp(this.points[hi], span ? (s - this.distances[lo]) / span : 0);
    }
    sample(s) {
      const position = this._position(s);
      const forward = this._position(Math.min(this.length, s + .75)).sub(this._position(Math.max(0, s - .75))).normalize();
      return { position, forward, rotation: Math.atan2(-forward.x, -forward.z) };
    }
    project(position) {
      let best = Infinity, result = 0;
      for (let i = 1; i < this.points.length; i++) {
        const a = this.points[i - 1], delta = this.points[i].clone().sub(a);
        const t = THREE.MathUtils.clamp(position.clone().sub(a).dot(delta) / delta.lengthSq(), 0, 1);
        const distance = a.clone().addScaledVector(delta, t).distanceToSquared(position);
        if (distance < best) { best = distance; result = this.distances[i - 1] + t * (this.distances[i] - this.distances[i - 1]); }
      }
      return result;
    }
  }
  function crossings(track) {
    return track.intersections.flatMap(junction => {
      const d = junction.definition;
      return d.approaches.map(approach => ({
        id: d.config.id + ':' + approach.id + ':crosswalk', junction, approach,
        center: d.center.clone().addScaledVector(approach.forward, -d.crosswalkDistance),
        forward: approach.forward.clone(), left: approach.left.clone(),
        halfWidth: d.config.laneWidth, halfDepth: d.config.crosswalkLength / 2,
        sidewalk: d.config.laneWidth + .8,
      }));
    });
  }
  function build(track) {
    const junctions = track.intersections;
    if (!junctions.length || !track.longRoad) throw new Error('Unified traffic needs the existing intersections and LongRoad');
    const first = junctions[0].definition, last = junctions[junctions.length - 1].definition;
    const lane = first.config.laneWidth / 2, y = track.roadHeight || first.center.y;
    const north = [], south = [];
    const startZ = track.getVehicleStartPosition().z + 5;
    const endZ = last.center.z - last.config.armLength + 5;
    const firstFrame = track.longRoad.frame(0), finalFrame = track.longRoad.frame(track.longRoad.length);
    function straight(points, x, from, to) {
      const steps = Math.max(1, Math.ceil(Math.abs(to - from) / 2));
      for (let i = 0; i <= steps; i++) points.push(new THREE.Vector3(x, y, from + (to - from) * i / steps));
    }
    straight(north, firstFrame.point.x - lane, startZ, firstFrame.point.z);
    straight(south, firstFrame.point.x + lane, startZ, firstFrame.point.z);
    for (let s = 0; s < track.longRoad.length; s += .75) {
      const frame = track.longRoad.frame(s);
      north.push(frame.point.clone().addScaledVector(frame.left, lane));
      south.push(frame.point.clone().addScaledVector(frame.left, -lane));
    }
    north.push(finalFrame.point.clone().addScaledVector(finalFrame.left, lane));
    south.push(finalFrame.point.clone().addScaledVector(finalFrame.left, -lane));
    straight(north, finalFrame.point.x - lane, finalFrame.point.z, endZ);
    straight(south, finalFrame.point.x + lane, finalFrame.point.z, endZ);
    const spineNorth = new RoutePath('unified:northbound', north);
    const spineSouth = new RoutePath('unified:southbound', south.reverse());
    const routes = [spineNorth, spineSouth], byApproach = new Map();
    for (const junction of junctions) {
      const d = junction.definition;
      for (const approach of d.approaches) {
        let route;
        if (approach.id === 'S') route = spineNorth;
        else if (approach.id === 'N') route = spineSouth;
        else {
          const outgoing = d.approaches.find(a => a.forward.dot(approach.forward) < -.99);
          route = new RoutePath(d.config.id + ':' + approach.id + ':straight', [
            d.point(approach, -approach.armLength + 4), d.point(approach, outgoing.armLength - 4),
          ]);
          routes.push(route);
        }
        const stopPoint = d.point(approach, -d.stopDistance - d.config.buffer);
        route.gates.push({ junction, approach, s: route.project(stopPoint) });
        byApproach.set(d.config.id + ':' + approach.id, route);
      }
    }
    routes.forEach(route => route.gates.sort((a, b) => a.s - b.s));
    return { routes, byApproach, spineNorth, spineSouth, crossings: crossings(track), up: UP };
  }
  root.TrafficRoutes = { RoutePath, build, crossings };
})(window);
