import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Player {
  playerbody;
  playermesh;
  dir = { right: false, left: false, forward: false, back: false };
  speed = 0;
  maxSpeed = 0.5;
  maxAngularSpeed = 2;
  acceleration = 0.05;

  constructor() {
    const playergeo = new THREE.BoxGeometry(1, 1, 0.5);
    const playermat = new THREE.MeshStandardMaterial({ color: 0xff00ff });
    const playermesh = new THREE.Mesh(playergeo, playermat);
    // scene.add(playermesh);
    playermesh.castShadow = true;

    this.playerbody = new CANNON.Body({
      mass: 2,
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.25)),
      linearDamping: 0.8,
      angularDamping: 0.8,
    });
    this.playerbody.position.set(0, -4, 2);

    this.playerbody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05)),
      new CANNON.Vec3(0.5, 0.5, 0.25)
    );
  }

  floatPlayer() {
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(
        this.playerbody.position.x,
        this.playerbody.position.y,
        this.playerbody.position.z
      ),
      new THREE.Vector3(0, 0, -1)
    );

    const intersects = raycaster.intersectObjects(scene.children, false);
    if (intersects.length >= 2) {
      const force = intersects[1].distance;
      const mult = 40;
      this.playerbody.applyForce(new CANNON.Vec3(0, 0, (1 / force) * mult));
    }

    this.playerbody.quaternion.toEuler(this.playerquat);
    // floating mechanics
    const maxTorqueAngle = (10 / 180) * Math.PI;
    const torqueVal = 4;
    if (!dir.left && !dir.right && !dir.forward && !dir.back) {
      // console.log(this.playerquat.x, this.playerquat.y, this.playerquat.z);
      if (this.playerbody.quaternion.x > maxTorqueAngle) {
        this.playerbody.applyTorque(new CANNON.Vec3(-torqueVal, 0, 0));
      }
      if (this.playerbody.quaternion.x < -maxTorqueAngle) {
        this.playerbody.applyTorque(new CANNON.Vec3(torqueVal, 0, 0));
      }
      if (this.playerbody.quaternion.y > maxTorqueAngle) {
        this.playerbody.applyTorque(new CANNON.Vec3(0, -torqueVal, 0));
      }
      if (this.playerbody.quaternion.y < -maxTorqueAngle) {
        this.playerbody.applyTorque(new CANNON.Vec3(0, torqueVal, 0));
      }
    }
  }
}

export default Player;
