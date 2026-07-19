import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import SceneSection from './SceneSection';
import { distance2D } from './utils';
import { CONTACT_LINKS } from './content';

class PlaceContactLinks extends SceneSection {
  ufomesh;
  buttonArray = [];

  onBtn = -1;

  constructor(scene, world, ufomesh, assets) {
    super(scene, world, assets);
    this.ufomesh = ufomesh;

    this.placeModelsPosition();
  }

  onEnter() {
    if (this.onBtn != -1) {
      window.open(this.onBtn, '_blank');
    }
  }

  async placeModelsPosition() {
    let xoff = 17,
      yoff = -8;
    const gmail = await this.placeGLBMesh(
      'gmail',
      xoff,
      yoff + 3,
      0,
      1,
      0.4,
      0.8,
    );
    gmail.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(gmail);
    this.scene.add(gmail);

    const github = await this.placeGLBMesh(
      'github',
      xoff + 6,
      yoff + 3,
      0.2,
      0.015,
      0.015,
      0.015,
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
      0.4,
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
      0.8,
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
      0.2,
    );
    this.scene.add(treeMesh);
    treeMesh.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMesh);

    //tree 2
    const treeMesh2 = await this.placeGLBMesh(
      'tree4ashoka',
      xoff - 2,
      yoff + 15.5,
      1.8,
      0.3,
      0.3,
      0.3,
    );
    this.scene.add(treeMesh2);
    treeMesh2.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMesh2);

    const stoneMesh = await this.placeGLBMesh(
      'stone24',
      xoff - 4,
      yoff + 18.5,
      -0.3,
      3,
      3,
      3,
    );
    this.scene.add(stoneMesh);
    this.placeGlbToCannonBody(stoneMesh);

    const stoneMesh2 = await this.placeGLBMesh(
      'stone24',
      xoff - 3,
      yoff + 13.5,
      -1,
      2,
      2,
      2,
    );
    this.scene.add(stoneMesh2);

    const stoneMesh3 = await this.placeGLBMesh(
      'stone24',
      xoff - 2,
      yoff + 13,
      -1,
      2.5,
      2.5,
      2.5,
    );
    this.scene.add(stoneMesh3);

    // treescene 3
    const appleTree = await this.placeGLBMesh(
      'apple tree',
      xoff - 4,
      yoff - 18,
      2.1,
    );
    appleTree.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(appleTree);
    this.placeGlbToCannonBody(appleTree);

    const appleTree2 = await this.placeGLBMesh(
      'apple tree',
      xoff - 1,
      yoff - 19,
      2.1,
      1.4,
      1.4,
      1.4,
    );
    appleTree2.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(appleTree2);
    this.placeGlbToCannonBody(appleTree2);

    const stoneMesh4 = await this.placeGLBMesh(
      'stone24',
      xoff - 5,
      yoff - 19,
      -1,
      1.2,
      1.2,
      1.5,
    );
    this.scene.add(stoneMesh4);

    const stoneMesh5 = await this.placeGLBMesh(
      'stone24',
      xoff - 4,
      yoff - 20.5,
      -1,
      1.7,
      1.2,
      2.5,
    );
    this.scene.add(stoneMesh5);

    const stoneMesh6 = await this.placeGLBMesh(
      'stone24',
      xoff - 7,
      yoff - 11,
      -0.2,
      4,
      3,
      3,
    );
    this.scene.add(stoneMesh6);
    this.placeGlbToCannonBody(stoneMesh6);

    //75B65A
    let bush = await this.placeGLBMesh('bush', xoff - 7, yoff + 1.7, -0.5);
    this.scene.add(bush);

    let bushDark = await this.placeGLBMesh(
      'dark bush',
      xoff - 6.1,
      yoff + 1.2,
      -0.5,
    );
    bushDark.rotation.set(Math.PI / 4, Math.PI / 2, 0);
    this.scene.add(bushDark);

    const fence = await this.placeGLBMesh(
      'fence 4 sticks',
      xoff + 2,
      yoff + 6,
      0,
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
      -Math.PI / 2,
    );
    stone.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(stone);
    this.placeGlbToCannonBody(stone);

    const loader = new FontLoader();
    loader.load('./fonts/Coffee Spark_Regular.json', (font) => {
      for (const contact of CONTACT_LINKS) {
        this.placeButtons(
          font,
          contact.link,
          xoff + contact.dx,
          yoff + contact.dy,
          -1,
        );
      }
    });

    loader.load('./fonts/Noto Sans SemiCondensed_Regular.json', (font) => {
      for (const contact of CONTACT_LINKS) {
        this.placeButtonNames(
          font,
          contact.name,
          xoff + contact.dx,
          yoff + contact.dy,
          -1.3,
        );
      }
    });
  }

  placeButtons(font, link, cx, cy, cz) {
    const cylindergeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
    const cylindermaterial = new THREE.MeshBasicMaterial({ color: 0xffb538 });
    const cylinder = new THREE.Mesh(cylindergeometry, cylindermaterial);
    cylinder.position.set(cx, cy, cz);
    cylinder.castShadow = true;
    cylinder.rotateX(Math.PI / 2);

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
      pressEnterMaterial,
    );
    pressEnterTextMesh.position.set(cx - 0.5, cy, cz + 3);
    pressEnterTextMesh.rotateX(Math.PI / 2);
    this.scene.add(pressEnterTextMesh);

    this.buttonArray.push({ button: cylinder, text: pressEnterTextMesh, link });
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

  update() {
    let isUfoOnButton = false;
    for (let i = 0; i < this.buttonArray.length; i++) {
      const button = this.buttonArray[i].button;
      const text = this.buttonArray[i].text;
      if (distance2D(button.position, this.ufomesh.position) < 1.1) {
        isUfoOnButton = true;
        text.material.opacity = Math.min(text.material.opacity + 0.05, 1);
        button.position.z = Math.max(button.position.z - 0.05, -1.2);
        this.onBtn = this.buttonArray[i].link;
      } else {
        text.material.opacity = Math.max(text.material.opacity - 0.05, 0);
        button.position.z = Math.min(button.position.z + 0.05, -1);
      }
    }
    if (!isUfoOnButton) {
      this.onBtn = -1;
    }
  }
}

export default PlaceContactLinks;
