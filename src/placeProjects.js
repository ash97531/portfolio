import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';
import {
  CSS2DObject,
  FontLoader,
  TextGeometry,
} from 'three/examples/jsm/Addons.js';

class PlaceProjects {
  scene;
  world;
  gltfLoader;
  assets;
  ufobody;
  ufomesh;
  dir;
  mountainArray = [];
  onMountain = -1;

  project1Mountain;
  project1MountainBody;
  cursor;
  mouse;
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

  constructor(scene, world, assets, ufobody, ufomesh, dir) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.assets = assets;
    this.ufobody = ufobody;
    this.ufomesh = ufomesh;
    this.dir = dir;

    this.placeModelsPosition();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.onMountain != -1) {
          const project = this.mountainArray[this.onMountain];
          if (
            Math.sqrt(
              Math.pow(project.position.x + 2.15 - this.ufobody.position.x, 2) +
                Math.pow(project.position.y - 0.1 - this.ufobody.position.y, 2)
            ) < 0.9 // radius of teleporter
          ) {
            // teleport to project mountain
            this.dir.move = false;
            this.teleportUfo();
          } else {
            // teleport to project link
            window.open(
              'https://pmndrs.github.io/cannon-es/docs/classes/Body.html#sleepyEvent',
              '_blank'
            );
          }
        }
      }
    });
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

      return;
    }

    requestAnimationFrame(() => this.teleportUfo());
  }

  async placeModelsPosition() {
    const loader = new FontLoader();
    let xoff = -9,
      yoff = -8;

    const projectSignPost = this.placeGLBMesh(
      'left sign post',
      xoff,
      yoff,
      -0.2,
      2,
      2,
      2
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
      -Math.PI / 2
    );
    androidIcon.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(androidIcon);

    const PCMouseControllerText = this.getTextMesh(
      'PC Mouse Controller',
      1.5,
      0.2
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
      -0.61
    );
    this.project1MountainBody = this.addMountain(this.project1Mountain);
    this.mouseControllerProject(
      this.project1Mountain,
      this.project1MountainBody
    );

    // Eshop project
    const ethereum = this.placeGLBMesh(
      'ethereum',
      xoff - 40,
      yoff - 4.5,
      0.4,
      3,
      4.5,
      3
    );
    this.placeGlbToCannonBody(ethereum);
    const eshopText = this.getTextMesh('E-shop', 0.4, 0.2);
    eshopText.position.set(-2.5, -0.5, -0.55);
    eshopText.scale.y = 0.8;
    ethereum.add(eshopText);
    this.scene.add(ethereum);

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
      Math.PI / 4
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
      -0.61
    );

    this.project2MountainBody = this.addMountain(this.project2Mountain);
    this.eShopProject(this.project2Mountain, this.project2MountainBody);

    // mountainMesh = mountainMesh.clone();
    // mountainMesh.position.set(xoff - 26.5, yoff - 12.3, 0.55);
    // this.addMountain(mountainMesh);

    // const rectLight = new THREE.RectAreaLight(0xff5d00, 10, 3, 3);
    // rectLight.position.set(-17, 3, 4);
    // rectLight.lookAt(-20, 0, 0.3);
    // this.scene.add(rectLight);
  }

  getTextMesh(text, size, depth) {
    const geometry = new TextGeometry(text, {
      font: this.assets['Chela One_Regular'],
      size: size,
      depth: depth,
      curveSegments: 10,
      bevelEnabled: false,
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.castShadow = true;
    return textMesh;
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
      new CANNON.Quaternion().setFromEuler(0, (-30 * Math.PI) / 180, 0)
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.4, 0.8, 0.6)),
      new CANNON.Vec3(1.8, 3, -3.1)
    );

    const kinematicBody = new CANNON.Body({
      // type: CANNON.Body.KINEMATIC,
      mass: 0,
      shape: new CANNON.Box(new CANNON.Vec3(0.8, 1.3, 1.3)),
      position: mountainBody.position.vadd(new CANNON.Vec3(-0.7, 1.3, 1.5)),
      quaternion: new CANNON.Quaternion().setFromEuler(
        0,
        0,
        (-70 * Math.PI) / 180
      ),
    });
    this.world.addBody(kinematicBody);
    kinematicBody.addEventListener('collide', (e) => {
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
          this.project2MountainBody.position.z + 2.65 //4.4
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
          new CANNON.Vec3(1.6, 2.4, 3.85)
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
      -0.66
    );
    mountain.add(screen);

    const mouse = this.placeGLBMesh('mouse', -0.04, 0.3, 0.5);
    mouse.rotation.set(0, 0, -0.66);
    mountain.add(mouse);

    const cursor = this.placeGLBMesh('cursor', -0.65, 0.1, 0.98, 1, 0.5, 0.5);
    cursor.rotation.set(0, 0, -0.66);
    mountain.add(cursor);

    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.2, 1, 1.8)),
      new CANNON.Vec3(-1.6, 2.8, -1),
      new CANNON.Quaternion().setFromEuler(0, (-50 * Math.PI) / 180, 0)
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
        size.x / 4 - 0.3,
        size.x / 4 + 2.6,
        size.z / 2 - 0.3,
        16
      ),
      quaternion: new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0),
    });
    mountainBody.quaternion.setFromEuler(Math.PI / 2, -0.35, 0);
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.5, 0.8, 0.8)),
      new CANNON.Vec3(1.6, 2, -2.8)
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.5, 1.4, 0.5)),
      new CANNON.Vec3(-3.4, 3, 1.1)
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.2, 0.8, 1.2)),
      new CANNON.Vec3(3.8, 1.6, -0.5),
      new CANNON.Quaternion().setFromEuler(0, (5 * Math.PI) / 180, 0)
    );
    mountainBody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.2, 0.8, 1.9)),
      new CANNON.Vec3(-2.1, 1.8, -2.5),
      new CANNON.Quaternion().setFromEuler(0, (-50 * Math.PI) / 180, 0)
    );

    this.world.addBody(mountainBody);
    return mountainBody;
  }

  guicheck(mesh) {
    const gui = new GUI();
    const folder = gui.addFolder('position');
    folder.add(
      mesh.position,
      'x',
      mesh.position.x - 10,
      mesh.position.x + 10,
      0.01
    );
    folder.add(
      mesh.position,
      'y',
      mesh.position.y - 10,
      mesh.position.y + 10,
      0.01
    );
    folder.add(
      mesh.position,
      'z',
      mesh.position.z - 2,
      mesh.position.z + 2,
      0.01
    );
    folder.open();
    const folder2 = gui.addFolder('rotation');
    folder2.add(mesh.rotation, 'x', -Math.PI, Math.PI, Math.PI / 180);
    folder2.add(mesh.rotation, 'y', -Math.PI, Math.PI, Math.PI / 180);
    folder2.add(mesh.rotation, 'z', -Math.PI, Math.PI, Math.PI / 180);
    folder2.open();
    const folder3 = gui.addFolder('scale');
    folder3.add(mesh.scale, 'x', 0, 5, 0.001);
    folder3.add(mesh.scale, 'y', 0, 5, 0.001);
    folder3.add(mesh.scale, 'z', 0, 5, 0.001);
    folder3.open();
  }

  guicannoncheck(mesh) {
    const gui = new GUI();
    const folder = gui.addFolder('position');
    folder.add(
      mesh.position,
      'x',
      mesh.position.x - 10,
      mesh.position.x + 10,
      0.1
    );
    folder.add(
      mesh.position,
      'y',
      mesh.position.y - 10,
      mesh.position.y + 10,
      0.1
    );
    folder.add(mesh.position, 'z', -2, 2, 0.1);
    folder.open();
    const folder2 = gui.addFolder('rotation');
    folder2.add(mesh.rotation, 'x', -Math.PI, Math.PI, Math.PI / 180);
    folder2.add(mesh.rotation, 'y', -Math.PI, Math.PI, Math.PI / 180);
    folder2.add(mesh.rotation, 'z', -Math.PI, Math.PI, Math.PI / 180);
    folder2.open();
  }

  placeGLBMesh(
    path,
    x = 0,
    y = 0,
    z = 0,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
    shadow = true
  ) {
    // const objectLoaded = await this.gltfLoader.loadAsync(`assets/${path}.glb`);
    // let objectMesh = objectLoaded.scene.children[0];
    const objectMesh = this.assets[path].clone();
    objectMesh.position.set(x, y, z);
    objectMesh.scale.set(sx, sy, sz);
    objectMesh.castShadow = true;
    objectMesh.receiveShadow = shadow;
    objectMesh.rotation.set(rx, ry, rz);

    return objectMesh;
  }

  placeGlbToCannonBody(mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    );
    const cannonBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(boxShape);
    cannonBody.position.copy(mesh.position);
    this.world.addBody(cannonBody);
  }

  checkTeleporter() {
    const project = this.mountainArray[this.onMountain];
    if (
      Math.sqrt(
        Math.pow(project.position.x + 2.15 - this.ufobody.position.x, 2) +
          Math.pow(project.position.y - 0.1 - this.ufobody.position.y, 2)
      ) < 0.9 // radius of teleporter
    ) {
      //switch on teleporter light
      project.children[13].intensity = 4;
      document.getElementById('modal-img').data = 'images/teleporter.png';
    } else {
      project.children[13].intensity = 0.5;
      document.getElementById('modal-img').data = 'images/ufo.png';
      //switch off teleporter light
    }
  }

  update() {
    if (
      Math.sqrt(
        Math.pow(
          this.project1Mountain.position.x - this.ufobody.position.x,
          2
        ) +
          Math.pow(
            this.project1Mountain.position.y - this.ufobody.position.y,
            2
          )
      ) < 4.83 // on mountain check
    ) {
      if (
        Math.sqrt(
          Math.pow(
            this.project1Mountain.position.x - this.ufobody.position.x,
            2
          ) +
            Math.pow(
              this.project1Mountain.position.y - this.ufobody.position.y,
              2
            )
        ) < 4.73 // top radius of mountain
      ) {
        this.onMountain = 0;
        this.checkTeleporter();

        document.getElementById('modal-container').classList.add('six');
        document.getElementById('modal-container').classList.remove('out');

        const cursor =
          this.project1Mountain.children[
            this.project1Mountain.children.length - 1
          ];
        const mouse =
          this.project1Mountain.children[
            this.project1Mountain.children.length - 2
          ];
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
        document.getElementById('modal-container').classList.add('out');
      }
    }

    if (
      Math.sqrt(
        Math.pow(
          this.project2Mountain.position.x - this.ufobody.position.x,
          2
        ) +
          Math.pow(
            this.project2Mountain.position.y - this.ufobody.position.y,
            2
          )
      ) < 4.83 // top radius of mountain
    ) {
      if (
        Math.sqrt(
          Math.pow(
            this.project2Mountain.position.x - this.ufobody.position.x,
            2
          ) +
            Math.pow(
              this.project2Mountain.position.y - this.ufobody.position.y,
              2
            )
        ) < 4.73 // top radius of mountain
      ) {
        this.onMountain = 1;
        this.checkTeleporter();

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
      }
    }
  }
}

export default PlaceProjects;
