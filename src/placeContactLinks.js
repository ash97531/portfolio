import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

class PlaceContactLinks {
  scene;
  world;
  gltfLoader;
  objectLoaded;

  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.placeModelsPosition();
  }

  async placeModelsPosition() {
    this.objectLoaded = await this.gltfLoader.loadAsync(`assets/gmail.glb`);
    this.loadModels(10, 3, 0, 1, 0.4, 0.8);
    this.objectLoaded = await this.gltfLoader.loadAsync(`assets/github.glb`);
    this.loadModels(14, 3, 0.2, 0.015, 0.015, 0.015);
    this.objectLoaded = await this.gltfLoader.loadAsync(`assets/linkedin.glb`);
    this.loadModels(10, -3, 0, 0.12, 0.1, 0.4);
    this.objectLoaded = await this.gltfLoader.loadAsync(`assets/playstore.glb`);
    this.loadModels(14, -3, 0, 1, 0.2, 0.8);
    this.objectLoaded = await this.gltfLoader.loadAsync(
      'assets/tree4ashoka.glb'
    );
    this.loadModels(6, 0, -1, 0.2, 0.2, 0.2);
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
}

export default PlaceContactLinks;
