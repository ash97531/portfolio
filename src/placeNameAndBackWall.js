import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import SceneSection from './SceneSection';
import InstancedMeshGroup from './InstancedMeshGroup';
import gltfLoader from './gltfLoader';

class PlaceNameAndBackWall extends SceneSection {
  gltfLoader;
  meshes = [];
  bodies = [];

  brickTemplate; // shared source mesh for all instanced bricks
  brickGroup; // back wall + left tree bricks (dynamic, one draw call)
  pavementGroup; // pavement bricks (static, one draw call)

  constructor(scene, world, meshes, bodies, assets) {
    super(scene, world, assets);
    this.gltfLoader = gltfLoader;
    this.meshes = meshes;
    this.bodies = bodies;

    // resolves once the pavement path exists, so lanterns can be aligned to it
    this.ready = this.placeModelsPosition();
  }

  // World-space positions of every pavement tile, in placement order (which
  // roughly traces the walkable path) - used to align lanterns along it.
  getPavementPositions() {
    const positions = [];
    const mat = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    for (let i = 0; i < this.pavementGroup.mesh.count; i++) {
      this.pavementGroup.mesh.getMatrixAt(i, mat);
      mat.decompose(pos, quat, scale);
      positions.push(pos.clone());
    }
    return positions;
  }

  // Sync instanced bricks to their physics bodies; called from App.animate.
  update() {
    this.brickGroup?.update();
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
      appleTree.position.add(new THREE.Vector3(0, 0, -0.5)),
    );
    this.world.addBody(cannonBody);

    // bricks behind left apple tree (instanced with the back-wall bricks)
    const dx = 0.02;
    const brickPlacements = [
      [xoff - 1.5, yoff - dx, 0, Math.PI / 2],
      [xoff - 1.5, yoff - 1 - dx, 0, Math.PI / 2],
      [xoff - 1.5, yoff - 2 - dx, 0, Math.PI / 2],
      [xoff - 1.5, yoff + 0.5, 0.6, Math.PI / 2],
      [xoff - 1.2, yoff + 1, 0, 0],
    ];
    for (const [x, y, z, rz] of brickPlacements) {
      const brickBody = this.placeGlbToDynamicBody(
        this.brickTemplate,
        x,
        y,
        z,
        0,
        0,
        rz,
      );
      this.world.addBody(brickBody);
      this.brickGroup.addBody(brickBody, this.brickTemplate.scale);
    }

    const stoneMesh = await this.placeGLBMesh(
      'apple tree stone',
      xoff + 0.6,
      yoff - 1.1,
      -0.7,
      0.3,
      0.3,
      0.25,
    );
    this.scene.add(stoneMesh);

    const stone2 = stoneMesh.clone();
    stone2.position.set(xoff + 0.9, yoff + 0.1, -0.75);
    stone2.scale.set(0.15, 0.15, 0.25);
    this.scene.add(stone2);
  }

  async pavements() {
    let xoff = -8,
      yoff = 5.5;
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
      true,
    );
    pavementBrick.material.color.set(0xffffff);

    // all pavement bricks are static: one instanced draw call
    this.pavementGroup = new InstancedMeshGroup(pavementBrick, 100);
    this.scene.add(this.pavementGroup.mesh);
    const paveScale = pavementBrick.scale;

    //front of left flashlight
    for (let i = 0; i < 4; i++) {
      this.pavementGroup.addStatic(
        xoff + (i % 2 == 0 ? 0 : 1) + Math.random() * 0.8 - 0.5,
        yoff - 0.9 * i + Math.random() + 0.8 - 0.4,
        -0.9,
        paveScale,
      );
    }

    //front of right flashlight
    ((xoff = 1.3), (yoff = 5.6));
    for (let i = 0; i < 5; i++) {
      this.pavementGroup.addStatic(
        xoff - (i % 2 == 0 ? 0 : 1) + Math.random() * 0.8 - 0.5,
        yoff - 0.9 * i + Math.random() * 0.8 - 0.4,
        -0.9,
        paveScale,
      );
    }

    ((xoff = -2), (yoff = 0));
    for (let i = 0; i < 6; i++) {
      this.pavementGroup.addStatic(
        xoff - (i % 2 == 0 ? 0 : 1) + Math.random() * 0.9 - 0.4,
        yoff - 0.9 * i,
        -0.9,
        paveScale,
      );
    }

    // center circle
    ((xoff = -2), (yoff = -10));

    const indiaMap = await this.placeGLBMesh(
      'india map',
      xoff,
      yoff + 1,
      0.1,
      1.2,
      1.2,
      1.2,
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
        this.pavementGroup.addStatic(
          xoff + arr[i][0] * 4 + arr[j][0] * 0.7 + Math.random() * 0.8 - 0.4,
          yoff + arr[i][1] * 4 + arr[j][1] * 0.7 + Math.random() * 0.8 - 0.4,
          -0.9,
          paveScale,
        );
        if (i != 0) {
          this.pavementGroup.addStatic(
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
            -0.9,
            paveScale,
          );
        }
      }
    }

    // Skill and achievement side pavement
    for (let i = 0; i < 5; i++) {
      this.pavementGroup.addStatic(
        xoff - (i % 2 == 0 ? 0 : 1) + Math.random() * 0.8 - 0.5,
        yoff - 7 - 0.9 * i + Math.random() * 0.8 - 0.4,
        -0.9,
        paveScale,
      );
    }

    // information side pavement
    for (let i = 0; i < 7; i++) {
      this.pavementGroup.addStatic(
        xoff + 8.5 + i + Math.random() * 0.9 - 0.4,
        yoff + (i % 2 == 0 ? 0 : 1) + Math.random() * 0.5 - 0.25,
        -0.9,
        paveScale,
        Math.PI / 2,
      );
    }

    // sloped side pavements: [xStart, yStart, count, slope]
    const slopedPaths = [
      [-8.5, -1.5, 7, -0.35], // project side
      [-23, -7, 7, -0.2], // experience 1
      [-43, -7.5, 5, 0.25], // project 2
      [-53, -7.5, 5, -0.2], // experience 2
      [-70, -7.5, 5, 0.25], // experience 3
    ];
    for (const [xStart, yStart, count, slope] of slopedPaths) {
      for (let i = 0; i < count; i++) {
        this.pavementGroup.addStatic(
          xoff + xStart - i - Math.random() * 0.9 + 0.4,
          yoff +
            yStart +
            (i % 2 == 0 ? 0 : 1) +
            i * slope +
            Math.random() * 0.5 -
            0.25,
          -0.9,
          paveScale,
          Math.PI / 2,
        );
      }
    }
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
      Math.PI / 2,
    );
    this.scene.add(stoneMesh);

    const box = new THREE.Box3().setFromObject(stoneMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2),
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
      new CANNON.Vec3(size2.x / 2, size2.y / 2, size2.z / 2),
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
      0.015,
    );
    const flashLightMesh2 = flashLightMesh.clone();
    // scene.add(flashLightMesh);
    const flashLightBody = this.placeGlbToDynamicBody(
      flashLightMesh,
      -5.6,
      0,
      1,
      0,
      Math.PI,
    );
    this.world.addBody(flashLightBody);

    const spotLight = new THREE.SpotLight(0xffff, 325);
    spotLight.position.set(0, 1, 0);
    spotLight.target.position.set(0, 13, 0);
    spotLight.angle = 0.6;
    // decorative light: skipping its shadow pass saves a full scene render
    spotLight.castShadow = false;
    flashLightMesh.add(spotLight);
    flashLightMesh.add(spotLight.target);
    this.scene.add(flashLightMesh);

    const flashLightBody2 = this.placeGlbToDynamicBody(
      flashLightMesh2,
      0.8,
      0,
      1,
      0,
      Math.PI,
    );
    this.world.addBody(flashLightBody2);

    const spotLight2 = new THREE.SpotLight(0xffff, 325);
    spotLight2.position.set(0, 1, 0);
    spotLight2.target.position.set(0, 13, 0);
    spotLight2.angle = 0.6;
    spotLight2.castShadow = false;
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
      await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('s', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('h', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('w', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('n', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('i', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    // write mesh for word 'kumar'
    meshArr.push(
      await this.placeGLBMesh('k', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('u', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('m', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );
    meshArr.push(
      await this.placeGLBMesh('r', 0, 0, 0, 0.05, 0.05, 0.05, 0, 0, 0, false),
    );

    bodyArr.push(this.placeGlbToDynamicBody(meshArr[0], xoffset, yoffset, 0));
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[1], xoffset + 1.55, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[2], xoffset + 3.05, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[3], xoffset + 5, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[4], xoffset + 7, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[5], xoffset + 8.7, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[6], xoffset + 10, yoffset, 0),
    );

    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[7], xoffset + 12, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[8], xoffset + 13.7, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[9], xoffset + 15.6, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[10], xoffset + 17.6, yoffset, 0),
    );
    bodyArr.push(
      this.placeGlbToDynamicBody(meshArr[11], xoffset + 19.4, yoffset, 0),
    );

    for (let i = 0; i < meshArr.length; i++) {
      this.scene.add(meshArr[i]);
      this.world.addBody(bodyArr[i]);
      this.meshes.push(meshArr[i]);
      this.bodies.push(bodyArr[i]);
    }
  }

  async placeBackWall() {
    this.brickTemplate = await this.placeGLBMesh(
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
      true,
    );
    // back wall (~103) + left tree (5) bricks in one instanced draw call
    this.brickGroup = new InstancedMeshGroup(this.brickTemplate, 120, {
      dynamic: true,
    });
    this.scene.add(this.brickGroup.mesh);

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
        const brickBody = this.placeGlbToDynamicBody(
          this.brickTemplate,
          i - 14 + (j % 2 != 0 ? 0.5 : 0) + i * dx,
          13,
          j - 0.5 - j * 0.5,
          0,
          0,
          (Math.random() * 50 - 25 * Math.PI) / 180,
        );
        this.world.addBody(brickBody);
        this.brickGroup.addBody(brickBody, this.brickTemplate.scale);
      }
    }
  }

  // Overrides SceneSection: the name letters (a, s, h, ...) are not in the
  // preloaded assets cache, so this loads each GLB from disk instead.
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
    shadow = true,
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
}

export default PlaceNameAndBackWall;
