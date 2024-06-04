import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

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
    const objectLoaded = await this.gltfLoader.loadAsync(
      `assets/project landscape2.glb`
    );
    let objectMesh = objectLoaded.scene.children[0];
    objectMesh.children.map((child) => {
      child.castShadow = true;
    });
    objectMesh.position.set(-20, 0, -0.3);
    objectMesh.rotation.z = -Math.PI / 2;
    this.scene.add(objectMesh);

    const rectLight = new THREE.RectAreaLight(0xff5d00, 10, 3, 3);
    rectLight.position.set(-17, 3, 4);
    rectLight.lookAt(-20, 0, 0.3);
    this.scene.add(rectLight);
  }
}

export default PlaceProjects;
