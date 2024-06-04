import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

class Player {
  scene;
  world;
  meshes;
  bodies;
  gltfLoader;

  ufobody;
  ufomesh;
  dir;
  speed = 0;
  maxSpeed = 0.5;
  maxAngularSpeed = 2;
  acceleration = 0.05;

  constructor(scene, world, meshes, bodies, dir) {
    this.scene = scene;
    this.world = world;
    this.meshes = meshes;
    this.bodies = bodies;
    this.dir = dir;
    this.gltfLoader = new GLTFLoader();

    this.initPlayer();
  }

  async initPlayer() {
    this.ufobody = new CANNON.Body({
      mass: 2,
      linearDamping: 0.8,
      angularDamping: 0.7,
    });
    // this.ufobody.addShape(cy);
    this.ufobody.position.set(0, -4, 2);

    this.ufobody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05)),
      new CANNON.Vec3(0, 0.6, 0)
    );
    this.ufobody.addShape(
      new CANNON.Cylinder(0.5, 0.5, 0.25, 8),
      new CANNON.Vec3(),
      new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0)
    );
    // this.ufobody.addShape(cy);
    this.world.addBody(this.ufobody);

    // const gltfLoader = new GLTFLoader();
    const ufoLoaded = await this.gltfLoader.loadAsync('assets/ufo2light.glb');
    this.ufomesh = ufoLoaded.scene.children[0];
    this.ufomesh.scale.set(0.003, 0.003, 0.003);
    this.ufomesh.position.set(0, 0, 0);
    this.ufomesh.castShadow = true;
    this.ufomesh.children.map((child) => {
      child.castShadow = true;
    });
    // console.log(this.ufomesh.position, this.ufobody.position);

    this.scene.add(this.ufomesh);

    this.meshes.push(this.ufomesh);
    this.bodies.push(this.ufobody);
  }

  floatPlayer() {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(
        this.ufobody.position.x,
        this.ufobody.position.y,
        this.ufobody.position.z
      ),
      new THREE.Vector3(0, 0, -1)
    );

    const intersects = raycaster.intersectObjects(this.scene.children, false);
    if (intersects.length >= 2) {
      const force = intersects[1].distance;
      const mult = 30;
      this.ufobody.applyForce(new CANNON.Vec3(0, 0, (1 / force) * mult));
    }

    let ufoquat = new CANNON.Vec3();
    this.ufobody.quaternion.toEuler(ufoquat);
    // floating mechanics
    const maxTorqueAngle = (10 / 180) * Math.PI;
    const torqueVal = 4;
    if (this.ufobody.angularVelocity.almostZero(0.5)) {
      // if (!dir.left && !dir.right && !dir.forward && !dir.back) {
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

  moveUfo() {
    let ufoquat = new CANNON.Vec3();
    this.ufobody.quaternion.toEuler(ufoquat);
    if (this.dir.forward) {
      if (speed > maxSpeed) speed = maxSpeed;
      this.applyLocalVelocity(this.ufobody, new CANNON.Vec3(0, speed, 0));
    }

    if (this.dir.back) {
      if (speed < -maxSpeed) speed = -maxSpeed;
      this.applyLocalVelocity(this.ufobody, new CANNON.Vec3(0, speed, 0));
    }

    if (
      this.ufobody.angularVelocity.length() < this.maxAngularSpeed &&
      this.dir.left
    ) {
      this.ufobody.angularVelocity.z += 0.5;
    }

    if (
      this.ufobody.angularVelocity.length() < this.maxAngularSpeed &&
      this.dir.right
    ) {
      this.ufobody.angularVelocity.z -= 0.5;
    }
  }

  applyLocalVelocity(body, localVelocity) {
    // Convert local velocity to a quaternion
    const localVelocityVec3 = new CANNON.Vec3(
      localVelocity.x,
      localVelocity.y,
      localVelocity.z
    );
    const worldVelocityVec3 = new CANNON.Vec3();

    // Rotate local velocity vector to world space using the body's quaternion
    body.quaternion.vmult(localVelocityVec3, worldVelocityVec3);

    // Add the transformed velocity to the body's current velocity
    body.velocity.x += worldVelocityVec3.x;
    body.velocity.y += worldVelocityVec3.y;
    // body.velocity.vadd(worldVelocityVec3, body.velocity);
  }
}

export default Player;
