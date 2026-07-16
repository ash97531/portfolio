import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';
import SceneSection from './SceneSection';
import { distance2D } from './utils';
import { PROJECT_LINKS } from './content';
import hud from './Hud';

// Distances (in world units) from a mountain's center.
const ON_MOUNTAIN_RADIUS = 4.83; // close enough to count as "on" the mountain
const MOUNTAIN_TOP_RADIUS = 4.73; // radius of the flat mountain top
const TELEPORTER_RADIUS = 0.9;
// Teleporter pad position relative to the mountain center.
const TELEPORTER_OFFSET = { x: 2.15, y: -0.1 };

class PlaceProjects extends SceneSection {
  ufobody;
  ufomesh;
  dir;
  camera;
  orbit;
  mountainArray = [];
  onMountain = -1;

  project1Mountain;
  project1MountainBody;
  transH = 0.5;
  transV = 0.5;

  project2Mountain;
  project2MountainBody;
  coinCannon;
  shop;
  shakeTime = 0.5;
  shakeIntensity = null;
  entered = false;
  coinAtTopOfShop;

  meshes = [];
  bodies = [];

  constructor(scene, world, assets, ufobody, ufomesh, dir, camera, orbit) {
    super(scene, world, assets);
    this.ufobody = ufobody;
    this.ufomesh = ufomesh;
    this.dir = dir;
    this.camera = camera;
    this.orbit = orbit;

    this.placeModelsPosition();
  }

  onEnter() {
    if (this.onMountain == -1) return;

    if (this.isUfoOnTeleporter()) {
      // teleport to the other project mountain
      this.dir.move = false;
      this.teleportUfo();
    } else if (PROJECT_LINKS[this.onMountain]) {
      window.open(PROJECT_LINKS[this.onMountain], '_blank');
    }
  }

  isUfoOnTeleporter() {
    const project = this.mountainArray[this.onMountain];
    return (
      distance2D(
        {
          x: project.position.x + TELEPORTER_OFFSET.x,
          y: project.position.y + TELEPORTER_OFFSET.y,
        },
        this.ufobody.position,
      ) < TELEPORTER_RADIUS
    );
  }

  teleportUfo() {
    if (this.ufomesh.scale.x > 0.1) {
      this.ufomesh.scale.x -= 0.015;
      this.ufomesh.scale.y -= 0.015;
      this.ufomesh.scale.z -= 0.015;
    } else {
      this.onMountain = (this.onMountain + 1) % this.mountainArray.length;
      this.ufobody.position.x = this.mountainArray[this.onMountain].position.x;
      this.ufobody.position.y = this.mountainArray[this.onMountain].position.y;
      this.ufobody.position.z = 3;
      this.ufomesh.scale.set(1, 1, 1);
      this.dir.move = true;

      this.moveCamera(
        {
          x: this.ufobody.position.x,
          y: this.ufobody.position.y - 7,
          z: this.camera.position.z,
        },
        {
          x: this.ufobody.position.x,
          y: this.ufobody.position.y,
          z: 0.5,
        },
      );

      return;
    }

    requestAnimationFrame(() => this.teleportUfo());
  }

  moveCamera(camPos, orbitPos) {
    new TWEEN.Tween(this.camera.position)
      .to(camPos, 2000) // Move camera to the target position over 2000ms (2 seconds)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();

    new TWEEN.Tween(this.orbit.target)
      .to(orbitPos, 2000) // Move controls target to the target position over 2000ms (2 seconds)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  }

  async placeModelsPosition() {
    let xoff = -9,
      yoff = -8;

    const projectSignPost = this.placeGLBMesh(
      'left sign post',
      xoff,
      yoff,
      -0.2,
      2,
      2,
      2,
    );
    projectSignPost.rotation.set(0, 0, -Math.PI / 2);
    projectSignPost.children.map((child) => {
      child.castShadow = true;
    });

    const projectTextMesh = this.getTextMesh('Projects', 0.2, 0.05);
    projectTextMesh.position.set(0.1, -0.35, 0.65);
    projectTextMesh.rotation.set(Math.PI / 2, Math.PI / 2, 0);

    projectSignPost.add(projectTextMesh);
    this.scene.add(projectSignPost);
    this.placeGlbToCannonBody(projectSignPost);

    // PC Mouse Controller project
    const androidIcon = this.placeGLBMesh(
      'android icon',
      xoff - 10,
      yoff - 4,
      0.2,
      0.6,
      0.6,
      0.7,
      0,
      0,
      -Math.PI / 2,
    );
    androidIcon.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(androidIcon);

    const PCMouseControllerText = this.getTextMesh(
      'PC Mouse Controller',
      1.5,
      0.2,
    );
    PCMouseControllerText.position.set(3.2, -16.4, -1.48);
    PCMouseControllerText.rotation.set(0, 0, Math.PI / 2);
    androidIcon.add(PCMouseControllerText);
    this.scene.add(androidIcon);

    this.project1Mountain = this.placeGLBMesh(
      'project landscape2',
      xoff - 16, //4,
      yoff + 3.5, //4,
      0.55,
      3,
      3,
      3,
      0,
      0,
      -0.61,
    );
    this.project1MountainBody = this.addMountain(this.project1Mountain);
    this.mouseControllerProject(
      this.project1Mountain,
      this.project1MountainBody,
    );

    // Eshop project
    const bitcoin = this.placeGLBMesh(
      'bitcoin',
      xoff - 39,
      yoff - 4.5,
      0.5,
      3.2,
      4.5,
      3.2,
    );
    this.placeGlbToCannonBody(bitcoin);
    const eshopText = this.getTextMesh('E-shop', 0.4, 0.2);
    eshopText.position.set(-2.5, -0.5, -0.55);
    eshopText.scale.y = 0.8;
    bitcoin.add(eshopText);
    bitcoin.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(bitcoin);

    const blockchainModel = this.placeGLBMesh(
      'blockchain',
      xoff - 40.7,
      yoff - 6,
      -0.43,
      2.5,
      2.5,
      2.5,
      0,
      0,
      Math.PI / 4,
    );
    blockchainModel.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(blockchainModel);
    this.scene.add(blockchainModel);

    this.project2Mountain = this.placeGLBMesh(
      'project landscape2',
      xoff - 46.5, //20,
      yoff + 3, //4,
      0.55,
      3,
      3,
      3,
      0,
      0,
      -0.61,
    );

    this.project2MountainBody = this.addMountain(this.project2Mountain);
    this.eShopProject(this.project2Mountain, this.project2MountainBody);
  }

  eShopProject(mountain, mountainBody) {
    this.shop = this.placeGLBMesh('shop', 0, 0, -0.1, 0.3, 0.3, 0.4);
    mountain.add(this.shop);

    this.coinCannon = this.placeGLBMesh('cannon', 0, 0, 0.04, 0.3, 0.33, 0.3);
    mountain.add(this.coinCannon);

    const geometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.coinAtTopOfShop = new THREE.Mesh(geometry, material);
    mountain.add(this.coinAtTopOfShop);
    this.coinAtTopOfShop.position.set(-0.4, 0.2, 1.05);

    // cannon1
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.5, 0.6, 0.5)),
      new CANNON.Vec3(-1, 2, 3.4),
      new CANNON.Quaternion().setFromEuler(0, (-30 * Math.PI) / 180, 0),
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.4, 0.8, 0.6)),
      new CANNON.Vec3(1.8, 3, -3.1),
    );

    const kinematicBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.8, 1.3, 1.3)),
      position: mountainBody.position.vadd(new CANNON.Vec3(-0.7, 1.3, 1.5)),
      quaternion: new CANNON.Quaternion().setFromEuler(
        0,
        0,
        (-70 * Math.PI) / 180,
      ),
    });
    this.world.addBody(kinematicBody);
    kinematicBody.addEventListener('collide', () => {
      if (this.shakeTime <= 0.5) this.resetShopAndCannon();
    });
  }

  shakeObject(object) {
    if (this.shakeTime > 0) {
      this.shakeTime -= 0.01;
      if (this.shakeIntensity == null) {
        this.shakeIntensity = Math.random() * 0.04 - 0.02;
        object.position.x += this.shakeIntensity;
      } else {
        object.position.x -= this.shakeIntensity;
        this.shakeIntensity = null;
      }
    }
  }

  fireCoinCannon() {
    //fire coin
    if (this.shakeTime == 0.5) {
      this.shakeTime = 0.48;
      const geometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const coin = new THREE.Mesh(geometry, material);
      this.scene.add(coin);

      const coinBody = new CANNON.Body({
        mass: 0.2,
        shape: new CANNON.Cylinder(0.15, 0.15, 0.1, 8),
        position: new CANNON.Vec3(
          this.project2MountainBody.position.x - 0.6, //5.6
          this.project2MountainBody.position.y - 2.7, //6.4
          this.project2MountainBody.position.z + 2.65, //4.4
        ),
        quaternion: new CANNON.Quaternion().setFromEuler(0, 0, 0),
        allowSleep: true,
        sleepSpeedLimit: 0.1,
        sleepTimeLimit: 1,
      });
      this.world.addBody(coinBody);
      this.meshes.push(coin);
      this.bodies.push(coinBody);
      coinBody.applyForce(new CANNON.Vec3(20, 30, 30));

      const coin2 = coin.clone();
      this.scene.add(coin2);
      const coinBody2 = new CANNON.Body({
        mass: 0.2,
        shape: new CANNON.Cylinder(0.15, 0.15, 0.1, 8),
        position: this.project2MountainBody.position.vadd(
          new CANNON.Vec3(1.6, 2.4, 3.85),
        ),
        quaternion: new CANNON.Quaternion().setFromEuler(0, 0, 0),
        allowSleep: true,
        sleepSpeedLimit: 0.1,
        sleepTimeLimit: 1,
      });
      this.world.addBody(coinBody2);
      this.meshes.push(coin2);
      this.bodies.push(coinBody2);
      coinBody2.applyForce(new CANNON.Vec3(0, -30, 30));

      setTimeout(() => {
        this.scene.remove(coin);
        this.world.removeBody(coinBody);
        this.scene.remove(coin2);
        this.world.removeBody(coinBody2);
        this.meshes.splice(this.meshes.indexOf(coin), 1);
        this.bodies.splice(this.bodies.indexOf(coinBody), 1);
        this.meshes.splice(this.meshes.indexOf(coin2), 1);
        this.bodies.splice(this.bodies.indexOf(coinBody2), 1);
      }, 5000);
    }

    // shake cannon
    if (this.shakeTime > 0) {
      if (this.shakeTime > 0.5 / 2) {
        this.coinCannon.scale.x -= 0.002;
      } else {
        this.coinCannon.scale.x += 0.002;
      }
    }
  }

  resetShopAndCannon() {
    this.shakeTime = 0.5;
    this.coinCannon.scale.set(0.3, 0.33, 0.3);
  }

  mouseControllerProject(mountain, mountainBody) {
    const screen = this.placeGLBMesh(
      'screen and keyboard',
      -0.6,
      0.2,
      0.95,
      1,
      1,
      0.92,
      0,
      0,
      -0.66,
    );
    mountain.add(screen);

    const mouse = this.placeGLBMesh('mouse', -0.04, 0.3, 0.5);
    mouse.rotation.set(0, 0, -0.66);
    mouse.name = 'pcMouse';
    mountain.add(mouse);

    const cursor = this.placeGLBMesh('cursor', -0.65, 0.1, 0.98, 1, 0.5, 0.5);
    cursor.rotation.set(0, 0, -0.66);
    cursor.name = 'pcCursor';
    mountain.add(cursor);

    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.2, 1, 1.8)),
      new CANNON.Vec3(-1.6, 2.8, -1),
      new CANNON.Quaternion().setFromEuler(0, (-50 * Math.PI) / 180, 0),
    );
  }

  addMountain(mountainMesh) {
    const teleporter = this.placeGLBMesh('teleporter', 0.7, 0.2, 0.5, 1.1, 1.1);
    mountainMesh.add(teleporter);

    const teleporterLight = new THREE.PointLight(0x69e2f6, 0.5, 4);
    teleporterLight.position.set(0.7, 0.2, 0.65);
    teleporterLight.name = 'teleporterLight';
    mountainMesh.add(teleporterLight);

    mountainMesh.children.map((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    this.scene.add(mountainMesh);
    this.mountainArray.push(mountainMesh);

    const box = new THREE.Box3().setFromObject(mountainMesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const mountainBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: mountainMesh.position,
      shape: new CANNON.Cylinder(
        size.x / 4 - 0.6,
        size.x / 4 + 2.6,
        size.z / 2 - 0.3,
        16,
      ),
      quaternion: new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0),
    });
    mountainBody.quaternion.setFromEuler(Math.PI / 2, -0.35, 0);
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.5, 0.8, 0.8)),
      new CANNON.Vec3(1.6, 2, -2.8),
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.5, 1.4, 0.5)),
      new CANNON.Vec3(-3.4, 3, 1.1),
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.2, 0.8, 1.2)),
      new CANNON.Vec3(3.8, 1.6, -0.5),
      new CANNON.Quaternion().setFromEuler(0, (5 * Math.PI) / 180, 0),
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.2, 0.8, 1.9)),
      new CANNON.Vec3(-2.1, 1.8, -2.5),
      new CANNON.Quaternion().setFromEuler(0, (-50 * Math.PI) / 180, 0),
    );

    this.world.addBody(mountainBody);
    return mountainBody;
  }

  checkTeleporter() {
    const project = this.mountainArray[this.onMountain];
    const teleporterLight = project.getObjectByName('teleporterLight');
    if (this.isUfoOnTeleporter()) {
      teleporterLight.intensity = 4;
      hud.setMessage(
        'Press ENTER: Teleport to other project',
        'images/teleporter.png',
      );
    } else {
      teleporterLight.intensity = 0.5;
      hud.setMessage('Press ENTER: Fly to project', 'images/ufo.png');
    }
  }

  update() {
    const distToProject1 = distance2D(
      this.project1Mountain.position,
      this.ufobody.position,
    );
    if (distToProject1 < ON_MOUNTAIN_RADIUS) {
      if (distToProject1 < MOUNTAIN_TOP_RADIUS) {
        this.onMountain = 0;
        this.checkTeleporter();

        hud.show();

        const cursor = this.project1Mountain.getObjectByName('pcCursor');
        const mouse = this.project1Mountain.getObjectByName('pcMouse');
        if (this.dir.forward) {
          //cursor
          cursor.position.z = Math.min(cursor.position.z + 0.01, 1.2);
          if (this.transV > 0.3) {
            this.transV -= 0.01;
            mouse.translateX(-0.01);
          }
        }
        if (this.dir.back) {
          cursor.position.z = Math.max(cursor.position.z - 0.01, 0.72);
          if (this.transV < 0.6) {
            this.transV += 0.01;
            mouse.translateX(0.01);
          }
        }
        if (this.dir.left) {
          if (cursor.position.x > -0.889) cursor.translateY(-0.01);
          if (this.transH > 0.35) {
            this.transH -= 0.01;
            mouse.translateY(-0.01);
          }
        }
        if (this.dir.right) {
          if (cursor.position.x < -0.294) cursor.translateY(0.01);
          if (this.transH < 0.7) {
            this.transH += 0.01;
            mouse.translateY(0.01);
          }
        }
      } else {
        this.onMountain = -1;
        hud.hide();
      }
    }

    const distToProject2 = distance2D(
      this.project2Mountain.position,
      this.ufobody.position,
    );
    if (distToProject2 < ON_MOUNTAIN_RADIUS) {
      if (distToProject2 < MOUNTAIN_TOP_RADIUS) {
        this.onMountain = 1;
        this.checkTeleporter();

        hud.show();

        this.coinAtTopOfShop.rotateZ(0.05);
        this.fireCoinCannon();
        this.shakeObject(this.shop);

        for (let i = 0; i < this.meshes.length; i++) {
          this.meshes[i].position.copy(this.bodies[i].position);
          this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
        }
      } else {
        this.onMountain = -1;
        this.shakeTime = 0.5;
        hud.hide();
      }
    }
  }
}

export default PlaceProjects;
