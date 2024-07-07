import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';
import { TextGeometry } from 'three/examples/jsm/Addons.js';

class PlaceAchievements {
  world;
  scene;
  meshes;
  bodies;
  assets;
  gltfLoader;

  constructor(scene, world, meshes, bodies, assets) {
    this.world = world;
    this.scene = scene;
    this.meshes = meshes;
    this.bodies = bodies;
    this.assets = assets;
    this.gltfLoader = new GLTFLoader();

    this.placeModalsPosition();
  }

  createBrickJenga() {
    const dx = 0.01;
    const xoff = -20,
      yoff = -23;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 2; j++) {
        if (i % 2 == 1) {
          const brick = this.placeGLBMesh('brick', 0, 0, 0, 0.25, 0.5, 0.25);
          const brickBody = this.placeGlbToDynamicBody(
            brick,
            xoff - j * 0.5 - j * dx + 0.25,
            yoff - 0.25,
            i - 0.5 * i - 0.4
          );
          this.scene.add(brick);
          this.world.addBody(brickBody);
          this.meshes.push(brick);
          this.bodies.push(brickBody);
        } else {
          const brick = this.placeGLBMesh('brick', 0, 0, 0, 0.5, 0.25, 0.25);
          const brickBody = this.placeGlbToDynamicBody(
            brick,
            xoff,
            yoff - j * 0.5 - j * dx,
            i - 0.5 * i - 0.4
          );
          this.scene.add(brick);
          this.world.addBody(brickBody);
          this.meshes.push(brick);
          this.bodies.push(brickBody);
        }
      }
    }

    const flashLightMesh = this.placeGLBMesh(
      'flashlight optimised',
      0,
      0,
      0,
      0.02,
      0.02,
      0.015
    );
    const flashLightBody = this.placeGlbToDynamicBody(
      flashLightMesh,
      xoff,
      yoff - 0.2,
      3,
      0,
      Math.PI,
      Math.PI / 3
    );
    this.world.addBody(flashLightBody);

    const spotLight = new THREE.SpotLight(0xffff, 250);
    spotLight.position.set(0, 1, 0);
    spotLight.target.position.set(0, 13, 0);
    spotLight.angle = 0.6;
    spotLight.castShadow = true;
    flashLightMesh.add(spotLight);
    flashLightMesh.add(spotLight.target);
    this.scene.add(flashLightMesh);

    this.meshes.push(flashLightMesh);
    this.bodies.push(flashLightBody);
  }

  async placeModalsPosition() {
    let xoff = -2,
      yoff = -23;

    const treeMeshDec = await this.placeGLBMesh(
      'tree4ashoka',
      xoff - 23,
      yoff - 11,
      1.8,
      0.3,
      0.3,
      0.3
    );
    this.scene.add(treeMeshDec);
    treeMeshDec.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMeshDec);

    const fence = await this.placeGLBMesh(
      'fence 4 sticks',
      xoff - 22,
      yoff - 13,
      0
    );
    fence.rotation.set(0, 0, Math.PI / 2);
    this.scene.add(fence);
    this.placeGlbToCannonBody(fence);

    const fence2 = await this.placeGLBMesh(
      'fence 4 sticks',
      xoff - 25,
      yoff - 9,
      0
    );
    this.scene.add(fence2);
    this.placeGlbToCannonBody(fence2);

    const stoneMesh = await this.placeGLBMesh(
      'stone24',
      xoff - 13,
      yoff - 9,
      -1.2,
      3,
      3,
      3
    );
    this.scene.add(stoneMesh);
    this.placeGlbToCannonBody(stoneMesh);

    const stoneMesh2 = await this.placeGLBMesh(
      'stone24',
      xoff - 14,
      yoff - 8,
      -1.1,
      2,
      2,
      2
    );
    this.scene.add(stoneMesh2);
    this.placeGlbToCannonBody(stoneMesh2);

    const stoneMesh3 = await this.placeGLBMesh(
      'stone24',
      xoff - 13,
      yoff - 7.5,
      -1.1,
      1.5,
      1.5,
      1.5
    );
    this.scene.add(stoneMesh3);
    this.placeGlbToCannonBody(stoneMesh3);

    const combinedstone = await this.placeGLBMesh(
      'stone combined 1',
      xoff - 8,
      yoff - 14.5,
      -0.25,
      0.004,
      0.004,
      0.004,
      0,
      0,
      1
    );
    combinedstone.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(combinedstone);
    this.placeGlbToCannonBody(combinedstone);

    const bush = await this.placeGLBMesh(
      'bush',
      xoff + 2,
      yoff - 12,
      -0.5,
      1.2,
      1.2,
      1.2
    );
    this.scene.add(bush);

    const bush2 = await this.placeGLBMesh(
      'bush',
      xoff + 3,
      yoff - 12.5,
      -0.5,
      1.4,
      1.4,
      1.2
    );
    this.scene.add(bush2);

    const bush3 = await this.placeGLBMesh(
      'bush',
      xoff + 2.5,
      yoff - 13.5,
      -0.5
    );
    this.scene.add(bush3);
    bush3.rotation.set(Math.PI / 4, 0, 0);

    const bushDark = await this.placeGLBMesh(
      'dark bush',
      xoff + 1.1,
      yoff - 11.5,
      -0.5,
      1.2,
      1.2,
      1.2
    );
    bushDark.rotation.set(Math.PI / 4, Math.PI / 2, 0);
    this.scene.add(bushDark);

    const darkBush2 = await this.placeGLBMesh(
      'dark bush',
      xoff + 3.1,
      yoff - 11.5,
      -0.5,
      1.4,
      1.4,
      1.2
    );
    darkBush2.rotation.set(Math.PI / 4, 0, 0);
    this.scene.add(darkBush2);

    const darkBush3 = await this.placeGLBMesh(
      'dark bush',
      xoff + 1,
      yoff - 12.7,
      -0.5,
      1.6,
      1.6,
      1.6
    );
    this.scene.add(darkBush3);

    const trophy = await this.placeGLBMesh(
      'trophy',
      xoff + 4,
      yoff,
      0.5,
      0.65,
      0.65,
      0.65
    );
    trophy.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(trophy);
    this.placeGlbToCannonBody(trophy);

    const treeMesh = await this.placeGLBMesh(
      'tree4ashoka',
      xoff - 4,
      yoff,
      0.9,
      0.2,
      0.2,
      0.2
    );
    const archery = await this.placeGLBMesh(
      'archery skills',
      0,
      -3.1,
      2,
      2.5,
      2.5,
      2.5,
      -Math.PI / 7
    );
    treeMesh.add(archery);
    this.scene.add(treeMesh);
    treeMesh.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMesh);

    const headingText = this.getTextMesh('  Skills &\nAchievement', 0.7, 0.3);
    headingText.position.set(xoff - 2.5, yoff, -1);
    this.scene.add(headingText);

    const ach1 = this.getTextMesh(
      '-> Global rank 3364 (AIR 919) out of\n     10k+ teams in Hashcode 2021',
      0.4,
      0.3
    );
    ach1.position.set(xoff - 4, yoff - 3, -1);
    this.scene.add(ach1);

    const ach2 = this.getTextMesh(
      '-> Smart India Hackathon Finalist 2022\n     (Built Disaster simulation tool)',
      0.4,
      0.3
    );
    ach2.position.set(xoff - 4, yoff - 4.5, -1);
    this.scene.add(ach2);

    const ach3 = this.getTextMesh(
      '-> 500+ Questions on Leetcode and\n     Codeforces',
      0.4,
      0.3
    );
    ach3.position.set(xoff - 4, yoff - 6, -1);
    this.scene.add(ach3);

    const ach4 = this.getTextMesh(
      '-> Secured 2nd rank out out of 5500+\n     teams in Microsoft Github Copilot\n     Hackathon',
      0.4,
      0.3
    );
    ach4.position.set(xoff - 4, yoff - 7.5, -1);
    this.scene.add(ach4);

    const leftSideSkills = this.getTextMesh(
      '* Java * C/C++ * React * MongoDB *',
      0.4,
      0.3
    );
    leftSideSkills.position.set(xoff - 5.5, yoff - 10.5, -1);
    leftSideSkills.rotation.set(0, 0, Math.PI / 2);
    this.scene.add(leftSideSkills);

    const rightSideSkills = this.getTextMesh(
      '* HTML/CSS/JS * Android * Flutter * SQL *',
      0.4,
      0.3
    );
    rightSideSkills.position.set(xoff + 6.5, yoff - 2, -1);
    rightSideSkills.rotation.set(0, 0, -Math.PI / 2);
    this.scene.add(rightSideSkills);

    this.createBrickJenga();
  }

  getTextMesh(text, size, depth) {
    const geometry = new TextGeometry(text, {
      font: this.assets['Gudea_Regular'],
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

  placeGlbToDynamicBody(mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
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

export default PlaceAchievements;
