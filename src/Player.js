import * as CANNON from 'cannon-es';
import gltfLoader from './gltfLoader';

// Hover raycast offsets, relative to the UFO body.
const FLOAT_RAY_FROM = new CANNON.Vec3(0, 0, -0.6);
const FLOAT_RAY_TO = new CANNON.Vec3(0, 0, -50);

// The world areas the player can meaningfully be "at". Outside all of
// them the player counts as lost and the direction arrow appears.
// Centers/radii derived from the section placement code.
const POPULATED_ZONES = [
  { x: -2, y: 2, r: 28 }, // center: name wall, flashlights, india map
  { x: 19, y: -8, r: 22 }, // contact links and surrounding greenery
  { x: -25, y: -4.5, r: 15 }, // project 1 (PC Mouse Controller)
  { x: -55.5, y: -5, r: 15 }, // project 2 (E-shop)
  { x: -38.4, y: -22, r: 15 }, // experience 1 (Marlin AI)
  { x: -65.5, y: -23, r: 15 }, // experience 2 (GameOn)
  { x: -82.4, y: -20, r: 15 }, // experience 3 (Brane)
  { x: -2, y: -27, r: 14 }, // skills & achievements
  { x: -22, y: -32, r: 14 }, // jenga stack + achievement greenery
];

// The UFO: physics body, mesh, movement and hover mechanics.
class Player {
  scene;
  world;

  ufobody;
  ufomesh;
  directionArrow;

  dir = {
    right: false,
    left: false,
    forward: false,
    back: false,
    move: true,
  };
  speed = 0;
  maxSpeed = 0.5;
  maxAngularSpeed = 2;
  acceleration = 0.09;

  // scratch objects reused every frame to avoid per-frame allocations
  _rayResult = new CANNON.RaycastResult();
  _rayFrom = new CANNON.Vec3();
  _rayTo = new CANNON.Vec3();
  _worldVelocity = new CANNON.Vec3();
  _localVelocity = new CANNON.Vec3();
  _levelTorque = new CANNON.Vec3();
  _localUp = new CANNON.Vec3(0, 0, 1);
  _currentUp = new CANNON.Vec3();

  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
  }

  async init() {
    this.ufobody = new CANNON.Body({
      mass: 2,
      linearDamping: 0.8,
      angularDamping: 0.99,
    });
    this.ufobody.position.set(0, -4, 12);

    this.ufobody.addShape(
      new CANNON.Cylinder(0.5, 0.5, 0.25, 8),
      new CANNON.Vec3(),
      new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0),
    );
    this.world.addBody(this.ufobody);

    const ufoLoaded = await gltfLoader.loadAsync('assets/ufo2glb.glb');
    this.ufomesh = ufoLoaded.scene.children[0];
    this.ufomesh.position.set(0, 0, 0);
    this.ufomesh.castShadow = true;
    this.ufomesh.children.forEach((child) => {
      child.castShadow = true;
    });

    const arrowLoaded = await gltfLoader.loadAsync('assets/cursor.glb');
    this.directionArrow = arrowLoaded.scene.children[0];
    this.directionArrow.position.set(0, 0, 2);
    this.directionArrow.scale.set(12, 6, 6);
    this.directionArrow.visible = false;
    this.ufomesh.add(this.directionArrow);

    this.scene.add(this.ufomesh);

    this.ufobody.quaternion.setFromEuler(0, 0, Math.PI);
    this.ufobody.applyForce(new CANNON.Vec3(2500, 0, 0));
  }

  syncMeshToBody() {
    this.ufomesh.position.copy(this.ufobody.position);
    this.ufomesh.quaternion.copy(this.ufobody.quaternion);
  }

  isMovingHorizontally() {
    return (
      Math.abs(this.ufobody.velocity.x) >= 0.1 ||
      Math.abs(this.ufobody.velocity.y) >= 0.1
    );
  }

  jump(cameraZ) {
    if (this.ufobody.position.z < cameraZ - 5)
      this.ufobody.applyForce(new CANNON.Vec3(0, 0, 600));
  }

  applyLocalVelocity(localVelocity) {
    // Rotate local velocity vector to world space using the body's quaternion
    this.ufobody.quaternion.vmult(localVelocity, this._worldVelocity);

    // Add the transformed velocity to the body's current velocity
    this.ufobody.velocity.x += this._worldVelocity.x;
    this.ufobody.velocity.y += this._worldVelocity.y;
  }

  moveUfo() {
    if (this.dir.move) {
      if (this.dir.forward) {
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        this._localVelocity.set(0, this.speed, 0);
        this.applyLocalVelocity(this._localVelocity);
      }

      if (this.dir.back) {
        if (this.speed < -this.maxSpeed) this.speed = -this.maxSpeed;
        this._localVelocity.set(0, this.speed, 0);
        this.applyLocalVelocity(this._localVelocity);
      }

      if (
        this.ufobody.angularVelocity.length() < this.maxAngularSpeed &&
        this.dir.left
      ) {
        this.ufobody.angularVelocity.z += 1.5;
      }

      if (
        this.ufobody.angularVelocity.length() < this.maxAngularSpeed &&
        this.dir.right
      ) {
        this.ufobody.angularVelocity.z -= 1.5;
      }
    }
  }

  floatUfo() {
    const result = this._rayResult;
    result.reset();
    this.ufobody.position.vadd(FLOAT_RAY_FROM, this._rayFrom);
    this.ufobody.position.vadd(FLOAT_RAY_TO, this._rayTo);
    this.world.raycastClosest(this._rayFrom, this._rayTo, {}, result);
    if (result.hasHit) {
      const dis = result.distance;
      const force = (1 / dis) * 17;
      this.ufobody.applyForce(new CANNON.Vec3(0, 0, force >= 27 ? 27 : force));
    } else {
      this.ufobody.applyForce(new CANNON.Vec3(0, 0, 27));
    }

    // floating mechanics: spring the UFO back to level (roll/pitch only -
    // yaw in .z is left alone, that's the turning direction). Torque is
    // proportional to (localUp x worldUp), which is yaw-invariant - unlike
    // using the raw quaternion x/y components directly (which only cancel
    // tilt correctly at zero yaw and badly overshoot at other headings,
    // since the UFO spawns facing 180deg). A derivative term against
    // angular velocity kills the ringing. Replaces the old deadband +
    // bang-bang torque, which only engaged past ~14deg of tilt and could
    // then stall at that boundary forever. Tuned (and verified in-browser
    // by stepping the physics loop directly) to recover from any tilt,
    // with or without spin from a hit, to level within ~1-1.5s.
    const LEVEL_SPRING = 10;
    const LEVEL_DAMPING = 2;
    this.ufobody.quaternion.vmult(this._localUp, this._currentUp);
    this._levelTorque.set(
      LEVEL_SPRING * this._currentUp.y -
        LEVEL_DAMPING * this.ufobody.angularVelocity.x,
      -LEVEL_SPRING * this._currentUp.x -
        LEVEL_DAMPING * this.ufobody.angularVelocity.y,
      0,
    );
    this.ufobody.applyTorque(this._levelTorque);
  }

  // Shows an arrow pointing back to the center when the UFO is outside
  // every populated zone (squared distances: no sqrt needed).
  checkIfLost() {
    const pos = this.ufomesh.position;
    const inZone = POPULATED_ZONES.some((zone) => {
      const dx = zone.x - pos.x;
      const dy = zone.y - pos.y;
      return dx * dx + dy * dy < zone.r * zone.r;
    });

    if (!inZone) {
      this.directionArrow.lookAt(0, 0, 0);
      this.directionArrow.visible = true;
    } else {
      this.directionArrow.visible = false;
    }
  }
}

export default Player;
