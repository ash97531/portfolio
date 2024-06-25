import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';

class PlaceNameAndBackWall {
  scene;
  world;
  gltfLoader;
  objectLoaded;
  meshses = [];
  bodies = [];
  assets;

  constructor(scene, world, meshes, bodies, assets) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.meshes = meshes;
    this.bodies = bodies;
    this.assets = assets;

    this.placeModelsPosition();
  }

  async placeModelsPosition() {
    await this.placeBackWall();
    await this.placeName();
    await this.placeStones();
    await this.placeFlashLights();
    await this.placeLeftTree();
    await this.pavements();
  }

  async placeLeftTree() {
    const xoff = -18,
      yoff = 9;
    const brickMesh = await this.placeGLBMesh(
      'brick',
      0,
      0,
      0,
      0.5,
      0.25,
      0.25,
      0,
      0,
      0,
      true
    );
    const appleTree = await this.placeGLBMesh('apple tree', xoff, yoff, 1.5);
    appleTree.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(appleTree);

    const box = new THREE.Box3().setFromObject(appleTree);
    const size = new THREE.Vector3();
    box.getSize(size);
    const sphereShape = new CANNON.Sphere(size.x / 2 + 0.1);
    const cannonBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(sphereShape);
    cannonBody.position.copy(
      appleTree.position.add(new THREE.Vector3(0, 0, -0.5))
    );
    this.world.addBody(cannonBody);
    // this.guicheck(cannonBody);

    // brick behind left apple tree
    const dx = 0.02;
    let brickArr = [];
    let brick = brickMesh.clone();
    let brickBody = this.placeGlbToCannonBody(
      brick,
      xoff - 1.5,
      yoff - dx,
      0,
      0,
      0,
      Math.PI / 2
    );
    brickArr.push([brick, brickBody]);

    brick = brickMesh.clone();
    brickBody = this.placeGlbToCannonBody(
      brick,
      xoff - 1.5,
      yoff - 1 - dx,
      0,
      0,
      0,
      Math.PI / 2
    );
    brickArr.push([brick, brickBody]);

    brick = brickMesh.clone();
    brickBody = this.placeGlbToCannonBody(
      brick,
      xoff - 1.5,
      yoff - 2 - dx,
      0,
      0,
      0,
      Math.PI / 2
    );
    brickArr.push([brick, brickBody]);

    brick = brickMesh.clone();
    brickBody = this.placeGlbToCannonBody(
      brick,
      xoff - 1.5,
      yoff + 0.5,
      0.6,
      0,
      0,
      Math.PI / 2
    );
    brickArr.push([brick, brickBody]);

    brick = brickMesh.clone();
    brickBody = this.placeGlbToCannonBody(brick, xoff - 1.2, yoff + 1);
    brickArr.push([brick, brickBody]);

    for (let i = 0; i < brickArr.length; i++) {
      this.scene.add(brickArr[i][0]);
      this.world.addBody(brickArr[i][1]);
      this.meshes.push(brickArr[i][0]);
      this.bodies.push(brickArr[i][1]);
    }

    const stoneMesh = await this.placeGLBMesh(
      'apple tree stone',
      xoff + 0.6,
      yoff - 1.1,
      -0.7,
      0.3,
      0.3,
      0.25
    );
    this.scene.add(stoneMesh);

    const stone2 = stoneMesh.clone();
    stone2.position.set(xoff + 0.9, yoff + 0.1, -0.75);
    stone2.scale.set(0.15, 0.15, 0.25);
    // this.guicheck(stoneMesh);
    this.scene.add(stone2);
  }

  async pavements() {
    let xoff = -8,
      yoff = 5.5;
    //front of left flashlight
    const pavementBrick = await this.placeGLBMesh(
      'brick',
      0,
      0,
      0,
      0.4,
      0.25,
      0.25,
      0,
      0,
      0,
      true
    );
    pavementBrick.material.color.set(0xffffff);

    for (let i = 0; i < 4; i++) {
      const pave = pavementBrick.clone();
      pave.position.set(
        xoff + (i % 2 == 0 ? 0 : 1) + Math.random() * 0.8 - 0.5,
        yoff - 0.9 * i + Math.random() + 0.8 - 0.4,
        -0.9
      );
      this.scene.add(pave);
    }

    //front of right flashlight
    (xoff = 1.3), (yoff = 5.6);
    for (let i = 0; i < 5; i++) {
      const pave = pavementBrick.clone();
      pave.position.set(
        xoff - (i % 2 == 0 ? 0 : 1) + Math.random() * 0.8 - 0.5,
        yoff - 0.9 * i + Math.random() * 0.8 - 0.4,
        -0.9
      );
      this.scene.add(pave);
    }

    (xoff = -2), (yoff = 0);
    for (let i = 0; i < 6; i++) {
      const pave = pavementBrick.clone();
      pave.position.set(
        xoff - (i % 2 == 0 ? 0 : 1) + Math.random() * 0.9 - 0.4,
        yoff - 0.9 * i,
        -0.9
      );
      this.scene.add(pave);
    }

    // center circle
    (xoff = -2), (yoff = -10);

    const indiaMap = await this.placeGLBMesh(
      'india map',
      xoff,
      yoff + 1,
      0.1,
      1.2,
      1.2,
      1.2
    );
    indiaMap.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(indiaMap);

    const arr = [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const pave = pavementBrick.clone();
        pave.position.set(
          xoff + arr[i][0] * 4 + arr[j][0] * 0.7 + Math.random() * 0.8 - 0.4,
          yoff + arr[i][1] * 4 + arr[j][1] * 0.7 + Math.random() * 0.8 - 0.4,
          -0.9
        );
        this.scene.add(pave);
        if (i != 0) {
          const pave = pavementBrick.clone();
          pave.position.set(
            xoff +
              arr[i][0] * 5 * (i % 2 == 0 ? 0 : 1) +
              arr[j][0] * 0.7 +
              Math.random() * 0.8 -
              0.4,
            yoff +
              arr[i][1] * 5 * (i % 2 == 0 ? -1 : 0) +
              arr[j][1] * 0.7 +
              Math.random() * 0.8 -
              0.4,
            -0.9
          );
          this.scene.add(pave);
        }
      }
    }

    // Skill and achievement side pavement
    for (let i = 0; i < 5; i++) {
      const pave = pavementBrick.clone();
      pave.position.set(
        xoff - (i % 2 == 0 ? 0 : 1) + Math.random() * 0.8 - 0.5,
        yoff - 7 - 0.9 * i + Math.random() * 0.8 - 0.4,
        -0.9
      );
      this.scene.add(pave);
    }

    // information side pavement
    for (let i = 0; i < 7; i++) {
      const pave = pavementBrick.clone();
      pave.rotation.z = Math.PI / 2;
      pave.position.set(
        xoff + 8.5 + i + Math.random() * 0.9 - 0.4,
        yoff + (i % 2 == 0 ? 0 : 1) + Math.random() * 0.5 - 0.25,
        -0.9
      );
      this.scene.add(pave);
    }

    // project side pavement
    let slope = -0.35;
    for (let i = 0; i < 7; i++) {
      const pave = pavementBrick.clone();
      pave.rotation.z = Math.PI / 2;
      pave.position.set(
        xoff - 8.5 - i - Math.random() * 0.9 + 0.4,
        yoff -
          1.5 +
          (i % 2 == 0 ? 0 : 1) +
          i * slope +
          Math.random() * 0.5 -
          0.25,
        -0.9
      );
      this.scene.add(pave);
    }

    //Experience 1 pavement
    slope = -0.2;
    for (let i = 0; i < 7; i++) {
      const pave = pavementBrick.clone();
      pave.rotation.z = Math.PI / 2;
      pave.position.set(
        xoff - 23 - i - Math.random() * 0.9 + 0.4,
        yoff -
          7 +
          (i % 2 == 0 ? 0 : 1) +
          i * slope +
          Math.random() * 0.5 -
          0.25,
        -0.9
      );
      this.scene.add(pave);
    }

    // project 2 pavement
    slope = 0.25;
    for (let i = 0; i < 5; i++) {
      const pave = pavementBrick.clone();
      pave.rotation.z = Math.PI / 2;
      pave.position.set(
        xoff - 43 - i - Math.random() * 0.9 + 0.4,
        yoff -
          7.5 +
          (i % 2 == 0 ? 0 : 1) +
          i * slope +
          Math.random() * 0.5 -
          0.25,
        -0.9
      );
      this.scene.add(pave);
    }

    // experience 2 button
    slope = -0.2;
    for (let i = 0; i < 5; i++) {
      const pave = pavementBrick.clone();
      pave.rotation.z = Math.PI / 2;
      pave.position.set(
        xoff - 53 - i - Math.random() * 0.9 + 0.4,
        yoff -
          7.5 +
          (i % 2 == 0 ? 0 : 1) +
          i * slope +
          Math.random() * 0.5 -
          0.25,
        -0.9
      );
      this.scene.add(pave);
    }
  }

  guicheck(mesh) {
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
    folder2.add(mesh.rotation, 'x', -Math.PI, Math.PI, 1);
    folder2.add(mesh.rotation, 'y', -Math.PI, Math.PI, 1);
    folder2.add(mesh.rotation, 'z', -Math.PI, Math.PI, 1);
    folder2.open();
    const folder3 = gui.addFolder('scale');
    folder3.add(mesh.scale, 'x', 0, 5, 0.001);
    folder3.add(mesh.scale, 'y', 0, 5, 0.001);
    folder3.add(mesh.scale, 'z', 0, 5, 0.001);
    folder3.open();
  }

  async placeStones() {
    const stoneMesh = await this.placeGLBMesh(
      'stone1',
      -5.6,
      0,
      -0.3,
      1,
      0.7,
      0.7,
      0,
      0,
      Math.PI / 2
    );
    this.scene.add(stoneMesh);

    const box = new THREE.Box3().setFromObject(stoneMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    );
    const cannonBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(boxShape);
    cannonBody.position.copy(stoneMesh.position);
    this.world.addBody(cannonBody);

    const stoneMesh2 = stoneMesh.clone();
    stoneMesh2.position.set(0.8, 0, -0.3);
    this.scene.add(stoneMesh2);

    const box2 = new THREE.Box3().setFromObject(stoneMesh2);
    const size2 = new THREE.Vector3();
    box2.getSize(size2);
    const boxShape2 = new CANNON.Box(
      new CANNON.Vec3(size2.x / 2, size2.y / 2, size2.z / 2)
    );
    const cannonBody2 = new CANNON.Body({
      type: CANNON.Body.STATIC,
    });
    cannonBody2.addShape(boxShape2);
    cannonBody2.position.copy(stoneMesh2.position);
    this.world.addBody(cannonBody2);
  }

  async placeFlashLights() {
    const flashLightMesh = await this.placeGLBMesh(
      'flashlight optimised',
      0,
      0,
      0,
      0.02,
      0.02,
      0.015
    );
    const flashLightMesh2 = flashLightMesh.clone();
    // scene.add(flashLightMesh);
    const flashLightBody = this.placeGlbToCannonBody(
      flashLightMesh,
      -5.6,
      0,
      1,
      0,
      Math.PI
    );
    this.world.addBody(flashLightBody);

    const spotLight = new THREE.SpotLight(0xffff, 325);
    spotLight.position.set(0, 1, 0);
    spotLight.target.position.set(0, 13, 0);
    spotLight.angle = 0.6;
    spotLight.castShadow = true;
    flashLightMesh.add(spotLight);
    flashLightMesh.add(spotLight.target);
    this.scene.add(flashLightMesh);

    const flashLightBody2 = this.placeGlbToCannonBody(
      flashLightMesh2,
      0.8,
      0,
      1,
      0,
      Math.PI
    );
    this.world.addBody(flashLightBody2);

    const spotLight2 = new THREE.SpotLight(0xffff, 325);
    spotLight2.position.set(0, 1, 0);
    spotLight2.target.position.set(0, 13, 0);
    spotLight2.angle = 0.6;
    spotLight2.castShadow = true;
    flashLightMesh2.add(spotLight2);
    flashLightMesh2.add(spotLight2.target);
    this.scene.add(flashLightMesh2);

    this.meshes.push(flashLightMesh);
    this.bodies.push(flashLightBody);
    this.meshes.push(flashLightMesh2);
    this.bodies.push(flashLightBody2);
  }

  async placeName() {
    let meshArr = [],
      bodyArr = [];
    const xoffset = -12,
      yoffset = 10;
    meshArr.push(
      await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('s', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('h', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('w', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('n', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('i', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    // write mesh for word 'kumar'
    meshArr.push(
      await this.placeGLBMesh('k', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('u', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('m', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );
    meshArr.push(
      await this.placeGLBMesh('r', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false)
    );

    bodyArr.push(this.placeGlbToCannonBody(meshArr[0], xoffset, yoffset, 0));
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[1], xoffset + 1.55, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[2], xoffset + 3.05, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[3], xoffset + 5, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[4], xoffset + 7, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[5], xoffset + 8.7, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[6], xoffset + 10, yoffset, 0)
    );

    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[7], xoffset + 12, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[8], xoffset + 13.7, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[9], xoffset + 15.6, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[10], xoffset + 17.6, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[11], xoffset + 19.4, yoffset, 0)
    );

    for (let i = 0; i < meshArr.length; i++) {
      this.scene.add(meshArr[i]);
      this.world.addBody(bodyArr[i]);
      this.meshes.push(meshArr[i]);
      this.bodies.push(bodyArr[i]);
    }
    // body = this.placeGlbToCannonBody(mesh, 0, 0, 0);
    // scene.add(meshArr[0]);
    // world.addBody(bodyArr[0]);

    // meshes.push(mesh);
    // bodies.push(body);
  }

  async placeBackWall() {
    const brickMesh = await this.placeGLBMesh(
      'brick',
      0,
      0,
      0,
      0.5,
      0.25,
      0.25,
      0,
      0,
      0,
      true
    );
    const skipArr = [
      [4, 4],
      [5, 4],
      [11, 4],
      [11, 3],
      [12, 4],
      [12, 3],
      [13, 4],
      [15, 4],
      [18, 4],
      [19, 4],
      [20, 4],
      [18, 3],
    ];
    // back wall bricks
    const dx = 0.02;
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 23; i++) {
        let skip = false;
        for (let e of skipArr) {
          if (i == e[0] && j == e[1]) {
            skip = true;
            break;
          }
        }
        if (skip) continue;
        const brick = brickMesh.clone();
        const brickBody = this.placeGlbToCannonBody(
          brick,
          i - 14 + (j % 2 != 0 ? 0.5 : 0) + i * dx,
          13,
          j - 0.5 - j * 0.5,
          0,
          0,
          (Math.random() * 50 - 25 * Math.PI) / 180
        );
        this.scene.add(brick);
        this.world.addBody(brickBody);
        this.meshes.push(brick);
        this.bodies.push(brickBody);
        // this.createBox('brick', i, j, 0);
      }
    }
  }

  async placeGLBMesh(
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
    const objectLoaded = await this.gltfLoader.loadAsync(`assets/${path}.glb`);
    let objectMesh = objectLoaded.scene.children[0];
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
      mass: 0.2, // kg
    });
    cannonBody.allowSleep = true;
    cannonBody.sleepSpeedLimit = 0.1;
    cannonBody.sleepTimeLimit = 0.5;
    cannonBody.addShape(boxShape);
    cannonBody.position.set(x, y, z);
    cannonBody.quaternion.setFromEuler(rx, ry, rz);
    return cannonBody;
  }
}

export default PlaceNameAndBackWall;
