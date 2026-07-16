import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { TextGeometry } from 'three/examples/jsm/Addons.js';

// Shared helpers for the world sections (projects, experience, contacts, ...).
// Subclasses may override `textFont` and `receiveShadowByDefault`.
class SceneSection {
  scene;
  world;
  assets;
  textFont = 'Chela One_Regular';
  receiveShadowByDefault = true;

  constructor(scene, world, assets) {
    this.scene = scene;
    this.world = world;
    this.assets = assets;
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
    shadow = this.receiveShadowByDefault,
  ) {
    const objectMesh = this.assets[path].clone();
    objectMesh.position.set(x, y, z);
    objectMesh.scale.set(sx, sy, sz);
    objectMesh.castShadow = true;
    objectMesh.receiveShadow = shadow;
    objectMesh.rotation.set(rx, ry, rz);

    return objectMesh;
  }

  // Static box body matching the mesh bounds; added to the world.
  placeGlbToCannonBody(mesh) {
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(mesh).getSize(size);
    const cannonBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(
      new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
    );
    cannonBody.position.copy(mesh.position);
    this.world.addBody(cannonBody);
    return cannonBody;
  }

  // Dynamic box body matching the mesh bounds; caller adds it to the world.
  placeGlbToDynamicBody(mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const size = new THREE.Vector3();
    new THREE.Box3().setFromObject(mesh).getSize(size);
    const cannonBody = new CANNON.Body({
      mass: 0.2, // kg
    });
    cannonBody.allowSleep = true;
    cannonBody.sleepSpeedLimit = 0.1;
    cannonBody.sleepTimeLimit = 0.5;
    cannonBody.addShape(
      new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
    );
    cannonBody.position.set(x, y, z);
    cannonBody.quaternion.setFromEuler(rx, ry, rz);
    return cannonBody;
  }

  getTextMesh(text, size, depth) {
    const geometry = new TextGeometry(text, {
      font: this.assets[this.textFont],
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
}

export default SceneSection;
