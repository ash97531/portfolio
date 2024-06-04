import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

class PlaceTrees {
  scene;
  world;
  gltfLoader;
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.placeTrees();
  }
  objectLoaded;

  async placeTrees() {
    this.objectLoaded = await this.gltfLoader.loadAsync(
      `assets/tree3texture.glb`
    );
    this.placeTreeMesh(0, 0, 0, 0.1, 0.1, 0.1, 0, 0, 0);
  }

  createTreePolyhedron(child) {
    // treemesh.traverse((child) => {
    //   if (child.isMesh) {
    const geometry = new THREE.Geometry().fromBufferGeometry(child.geometry);

    // Compute convex hull
    const convexHull = new THREE.ConvexHull().setFromObject(child);

    const vertices = [];
    const faces = [];

    // Extract vertices and faces from the convex hull
    convexHull.vertices.forEach((v) => {
      vertices.push(new CANNON.Vec3(v.x, v.y, v.z));
    });

    convexHull.faces.forEach((f) => {
      faces.push([f.a, f.b, f.c]);
    });

    // Create a Cannon.js ConvexPolyhedron
    const convexShape = new CANNON.ConvexPolyhedron(vertices, faces);

    // Create a Cannon.js body and add the convex shape
    const body = new CANNON.Body({ mass: 0 }); // Mass 0 for static object
    body.addShape(convexShape);
    body.position.copy(child.position);
    this.world.addBody(body);
    //   }
    // });
  }

  placeTreeMesh(
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
    objectMesh.castShadow = true;
    objectMesh.children.map((child) => {
      child.castShadow = true;
    });
    // degree
    objectMesh.rotation.set(rx, ry, rz);
    this.scene.add(objectMesh);

    // console.log(objectMesh);

    const box = new THREE.Box3().setFromObject(objectMesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    );
    const cannonBody = new CANNON.Body({
      mass: 0.2, // kg
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(boxShape);
    cannonBody.position.copy(objectMesh.position);
    this.world.addBody(cannonBody);
  }
}

export default PlaceTrees;
