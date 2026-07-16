import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { distance2D } from './utils';

// Hover raycast offsets, relative to the UFO body.
const FLOAT_RAY_FROM = new CANNON.Vec3(0, 0, -0.6);
const FLOAT_RAY_TO = new CANNON.Vec3(0, 0, -50);

// If no scene object (other than the ground) is within this 2D distance of
// the UFO, the player counts as lost and the direction arrow appears.
const EMPTY_AREA_RADIUS = 25;

// The UFO: physics body, mesh, movement and hover mechanics.
class Player {
  scene;
  world;
  gltfLoader = new GLTFLoader();

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

    const ufoLoaded = await this.gltfLoader.loadAsync('assets/ufo2glb.glb');
    this.ufomesh = ufoLoaded.scene.children[0];
    this.ufomesh.position.set(0, 0, 0);
    this.ufomesh.castShadow = true;
    this.ufomesh.children.forEach((child) => {
      child.castShadow = true;
    });

    const arrowLoaded = await this.gltfLoader.loadAsync('assets/cursor.glb');
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

    // floating mechanics
    const maxTorqueAngle = (7 / 180) * Math.PI;
    const torqueVal = 25 * maxTorqueAngle * 2;
    if (this.ufobody.angularVelocity.almostZero(0.5)) {
      if (this.ufobody.quaternion.x > maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(-torqueVal, 0, 0));
      }
      if (this.ufobody.quaternion.x < -maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(torqueVal, 0, 0));
      }
      if (this.ufobody.quaternion.y > maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(0, -torqueVal, 0));
      }
      if (this.ufobody.quaternion.y < -maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(0, torqueVal, 0));
      }
    }
  }

  // Shows an arrow pointing back to the center when the UFO is in an empty
  // area: nothing but the ground plane within EMPTY_AREA_RADIUS of the UFO.
  checkIfLost() {
    const nearSomething = this.scene.children.some((obj) => {
      if (obj === this.ufomesh || obj.isLight || obj.name === 'ground')
        return false;
      // instanced meshes sit at the origin; their position says nothing
      // about where their instances are
      if (obj.isInstancedMesh) return false;
      // skip helper Object3Ds without geometry (e.g. light targets)
      if (!obj.isMesh && obj.children.length === 0) return false;
      return (
        distance2D(obj.position, this.ufomesh.position) < EMPTY_AREA_RADIUS
      );
    });

    if (!nearSomething) {
      this.directionArrow.lookAt(0, 0, 0);
      this.directionArrow.visible = true;
    } else {
      this.directionArrow.visible = false;
    }
  }
}

export default Player;
