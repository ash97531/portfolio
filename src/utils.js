// Distance between two points in the ground (XY) plane.
// Accepts anything with `x` and `y` (THREE.Vector3, CANNON.Vec3, plain objects).
export function distance2D(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
