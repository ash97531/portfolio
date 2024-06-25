import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { FontLoader } from 'three/examples/jsm/Addons.js';
import { TextGeometry } from 'three/examples/jsm/Addons.js';
import { GUI } from 'dat.gui';

class PlaceContactLinks {
  scene;
  world;
  gltfLoader;
  objectLoaded;
  ufomesh;
  buttonArray = [];
  assets;

  constructor(scene, world, ufomesh, assets) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.assets = assets;
    this.ufomesh = ufomesh;

    this.placeModelsPosition();
    // this.placeButtons();
  }

  async placeModelsPosition() {
    let xoff = 17,
      yoff = -8;
    // this.objectLoaded = await this.gltfLoader.loadAsync(`assets/gmail.glb`);
    // this.loadModels(xoff, yoff + 3, 0, 1, 0.4, 0.8);
    const gmail = await this.placeGLBMesh(
      'gmail',
      xoff,
      yoff + 3,
      0,
      1,
      0.4,
      0.8
    );
    gmail.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(gmail);
    this.scene.add(gmail);

    // this.objectLoaded = await this.gltfLoader.loadAsync(`assets/github.glb`);
    // this.loadModels(xoff + 6, yoff + 3, 0.2, 0.015, 0.015, 0.015);
    // this.objectLoaded = await this.gltfLoader.loadAsync(`assets/linkedin.glb`);
    // this.loadModels(xoff, yoff - 3, 0, 0.12, 0.1, 0.4);
    // this.objectLoaded = await this.gltfLoader.loadAsync(`assets/playstore.glb`);
    // this.loadModels(xoff + 6, yoff - 3, 0, 1, 0.2, 0.8);
    const github = await this.placeGLBMesh(
      'github',
      xoff + 6,
      yoff + 3,
      0.2,
      0.015,
      0.015,
      0.015
    );
    github.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(github);
    this.scene.add(github);

    const linkedin = await this.placeGLBMesh(
      'linkedin',
      xoff,
      yoff - 3,
      0,
      0.12,
      0.1,
      0.4
    );
    linkedin.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(linkedin);
    this.scene.add(linkedin);

    const playstore = await this.placeGLBMesh(
      'playstore',
      xoff + 6,
      yoff - 3,
      0,
      1,
      0.2,
      0.8
    );
    playstore.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(playstore);
    this.scene.add(playstore);

    const treeMesh = await this.placeGLBMesh(
      'tree4ashoka',
      xoff - 6,
      yoff + 3,
      0.9,
      0.2,
      0.2,
      0.2
    );
    this.scene.add(treeMesh);
    treeMesh.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMesh);

    //75B65A
    let bush = await this.placeGLBMesh('bush', xoff - 7, yoff + 1.7, -0.5);
    this.scene.add(bush);

    let bushDark = await this.placeGLBMesh(
      'dark bush',
      xoff - 6.1,
      yoff + 1.2,
      -0.5
    );
    bushDark.rotation.set(Math.PI / 4, Math.PI / 2, 0);
    this.scene.add(bushDark);

    const fence = await this.placeGLBMesh(
      'fence 4 sticks',
      xoff + 2,
      yoff + 6,
      0
    );
    fence.rotation.set(0, 0, Math.PI / 2);
    this.scene.add(fence);
    this.placeGlbToCannonBody(fence);

    const fence2 = fence.clone();
    fence2.position.set(xoff + 5, yoff - 9, 0);
    this.scene.add(fence2);
    this.placeGlbToCannonBody(fence2);

    bush = bush.clone();
    bush.position.set(xoff + 10.2, yoff - 6, -0.4);
    bush.scale.set(1.2, 1.2, 1.2);
    this.scene.add(bush);

    bushDark = bushDark.clone();
    bushDark.position.set(xoff + 11.2, yoff - 7, -0.4);
    bushDark.scale.set(1.4, 1.4, 1.4);
    this.scene.add(bushDark);

    bushDark = bushDark.clone();
    bushDark.position.set(xoff + 11.2, yoff - 5.4, -0.4);
    this.scene.add(bushDark);

    const stone = await this.placeGLBMesh(
      'stone combined 1',
      xoff + 10,
      yoff + 6,
      -0.25,
      0.004,
      0.004,
      0.004,
      0,
      0,
      -Math.PI / 2
    );
    stone.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(stone);
    this.placeGlbToCannonBody(stone);
    // this.guicheck(stone);

    const loader = new FontLoader();
    loader.load('./fonts/Coffee Spark_Regular.json', (font) => {
      this.placeButtons(font, 'Gmail', xoff, yoff + 1, -1);
      this.placeButtons(font, 'Github', xoff + 6, yoff + 1, -1);
      this.placeButtons(font, 'LinkedIn', xoff, yoff - 5, -1);
      this.placeButtons(font, 'PlayStore', xoff + 6, yoff - 5, -1);
    });

    loader.load('./fonts/Noto Sans SemiCondensed_Regular.json', (font) => {
      this.placeButtonNames(font, 'GMAIL', xoff, yoff + 1, -1.3);
      this.placeButtonNames(font, 'GITHUB', xoff + 6, yoff + 1, -1.3);
      this.placeButtonNames(font, 'LINKEDIN', xoff, yoff - 5, -1.3);
      this.placeButtonNames(font, 'PLAYSTORE', xoff + 6, yoff - 5, -1.3);
    });
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
    folder.add(
      mesh.position,
      'z',
      mesh.position.z - 10,
      mesh.position.z + 10,
      0.1
    );
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
  placeButtons(font, text, cx, cy, cz) {
    const cylindergeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
    const cylindermaterial = new THREE.MeshBasicMaterial({ color: 0xffac1c });
    const cylinder = new THREE.Mesh(cylindergeometry, cylindermaterial);
    cylinder.position.set(cx, cy, cz);
    cylinder.castShadow = true;
    cylinder.rotateX(Math.PI / 2);

    const gui = new GUI();
    const p = { col: cylinder.material.color.getHex() };
    gui.addColor(p, 'col').onChange((val) => {
      cylinder.material.color.set(val);
    });

    const pressEnterTextGeometry = new TextGeometry('Press \nEnter', {
      font: font,
      size: 0.5,
      depth: 0.1,
      curveSegments: 12,
      bevelEnabled: false,
    });
    const pressEnterMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0, // Initially invisible
      transparent: true, // Necessary for opacity to work
    });
    const pressEnterTextMesh = new THREE.Mesh(
      pressEnterTextGeometry,
      pressEnterMaterial
    );
    pressEnterTextMesh.position.set(cx - 0.5, cy, cz + 3);
    pressEnterTextMesh.rotateX(Math.PI / 2);
    this.scene.add(pressEnterTextMesh);

    this.buttonArray.push({ button: cylinder, text: pressEnterTextMesh });
    // console.log(cylinder);

    this.scene.add(cylinder);
  }

  placeButtonNames(font, text, cx, cy, cz) {
    const geometry = new TextGeometry(text, {
      font: font,
      size: 0.5,
      depth: 0.1,
      curveSegments: 12,
      bevelEnabled: false,
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.set(cx - 1, cy - 1.7, cz + 0.5);
    this.scene.add(textMesh);
  }

  loadModels(
    x = 0,
    y = 0,
    z = 0,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0
  ) {
    let objectMesh = this.objectLoaded.scene.children[0];
    objectMesh.position.set(x, y, z);
    objectMesh.scale.set(sx, sy, sz);
    this.scene.add(objectMesh);
    objectMesh.castShadow = true;
    objectMesh.receiveShadow = true;
    // degree
    objectMesh.rotation.set(rx, ry, rz);

    objectMesh.children.map((child) => {
      child.castShadow = true;
    });

    const box = new THREE.Box3().setFromObject(objectMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    );
    const cannonBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(boxShape);
    cannonBody.position.copy(objectMesh.position);
    this.world.addBody(cannonBody);
  }

  update() {
    for (let i = 0; i < this.buttonArray.length; i++) {
      const button = this.buttonArray[i].button;
      const text = this.buttonArray[i].text;
      if (
        Math.sqrt(
          Math.pow(button.position.x - this.ufomesh.position.x, 2) +
            Math.pow(button.position.y - this.ufomesh.position.y, 2)
        ) < 1.1
      ) {
        text.material.opacity = Math.min(text.material.opacity + 0.05, 1);
        button.position.z = Math.max(button.position.z - 0.05, -1.2);
      } else {
        text.material.opacity = Math.max(text.material.opacity - 0.05, 0);
        button.position.z = Math.min(button.position.z + 0.05, -1);
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
}

export default PlaceContactLinks;
