import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';
import { FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';

class PlaceProjects {
  scene;
  world;
  gltfLoader;

  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();

    this.placeModelsPosition();
  }

  async placeModelsPosition() {
    const loader = new FontLoader();
    let xoff = -9,
      yoff = -8;

    const projectSignPost = await this.placeGLBMesh(
      'left sign post',
      xoff,
      yoff,
      -0.2,
      1.2,
      1.2,
      1.2
    );
    projectSignPost.rotation.set(0, 0, -Math.PI / 2);
    projectSignPost.children.map((child) => {
      child.castShadow = true;
    });
    loader.load('./fonts/Noto Sans SemiCondensed_Regular.json', (font) => {
      const geometry = new TextGeometry('Projects', {
        font: font,
        size: 0.2,
        depth: 0.05,
        curveSegments: 10,
        bevelEnabled: false,
      });
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const textMesh = new THREE.Mesh(geometry, material);
      textMesh.position.set(0.1, -0.45, 0.65);
      textMesh.rotation.set(Math.PI / 2, Math.PI / 2, 0);

      projectSignPost.add(textMesh);
      this.scene.add(projectSignPost);
      this.placeGlbToCannonBody(projectSignPost);
    });

    const androidIcon = await this.placeGLBMesh(
      'android icon',
      xoff - 6,
      yoff - 5.3,
      0.2,
      0.6,
      0.6,
      0.7
    );
    androidIcon.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(androidIcon);

    let mountainMesh = await this.placeGLBMesh(
      'project landscape2',
      xoff - 15.6,
      yoff - 0.5,
      0.55,
      3,
      3,
      3,
      0,
      0,
      -Math.PI / 10
    );
    this.addMountain(mountainMesh);

    mountainMesh = mountainMesh.clone();
    mountainMesh.position.set(xoff - 26.5, yoff - 12.3, 0.55);
    this.addMountain(mountainMesh);
    this.guicheck(mountainMesh);

    // const rectLight = new THREE.RectAreaLight(0xff5d00, 10, 3, 3);
    // rectLight.position.set(-17, 3, 4);
    // rectLight.lookAt(-20, 0, 0.3);
    // this.scene.add(rectLight);
  }

  addMountain(mountainMesh) {
    mountainMesh.children.map((child) => {
      child.castShadow = true;
      child.receiveShadow = true;
    });
    this.scene.add(mountainMesh);

    const box = new THREE.Box3().setFromObject(mountainMesh);
    const size = new THREE.Vector3();
    box.getSize(size);

    const mountainBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      position: mountainMesh.position,
      shape: new CANNON.Cylinder(
        size.x / 4 - 0.5,
        size.x / 4 + 2.4,
        size.z / 2 - 0.3,
        16
      ),
      quaternion: new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0),
    });
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
    // mountainBody.addShape(
    //   new CANNON.Box(new CANNON.Vec3(-0.2, 0.8, 1.2)),
    //   new CANNON.Vec3(3.8, 1.6, -0.5),
    //   new CANNON.Quaternion().setFromEuler(0, (+5 * Math.PI) / 180, 0)
    // );
    this.world.addBody(mountainBody);
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
    const folder3 = gui.addFolder('scale');
    folder3.add(mesh.scale, 'x', 0, 5, 0.001);
    folder3.add(mesh.scale, 'y', 0, 5, 0.001);
    folder3.add(mesh.scale, 'z', 0, 5, 0.001);
    folder3.open();
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
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(boxShape);
    cannonBody.position.copy(mesh.position);
    this.world.addBody(cannonBody);
  }
}

export default PlaceProjects;
