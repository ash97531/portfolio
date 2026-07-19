import * as THREE from 'three';

// Draws many copies of one mesh in a single draw call (THREE.InstancedMesh).
// Instances are either static (transform set once) or driven by a cannon
// body (synced every frame via update()).
class InstancedMeshGroup {
  mesh;
  entries = []; // per instance: { body, scale } or null for static instances

  _pos = new THREE.Vector3();
  _quat = new THREE.Quaternion();
  _euler = new THREE.Euler();
  _mat = new THREE.Matrix4();

  constructor(templateMesh, capacity, { material, dynamic = false } = {}) {
    const source = templateMesh.isMesh
      ? templateMesh
      : templateMesh.getObjectByProperty('isMesh', true);

    this.mesh = new THREE.InstancedMesh(
      source.geometry,
      material || source.material,
      capacity,
    );
    if (dynamic) {
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  addStatic(x, y, z, scale, rz = 0) {
    const index = this.mesh.count++;
    this._pos.set(x, y, z);
    this._quat.setFromEuler(this._euler.set(0, 0, rz));
    this._mat.compose(this._pos, this._quat, scale);
    this.mesh.setMatrixAt(index, this._mat);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.entries.push(null);
    return index;
  }

  // Instance that follows a physics body; call update() once per frame.
  addBody(body, scale) {
    const index = this.mesh.count++;
    this.entries.push({ body, scale: scale.clone() });
    this.syncInstance(index);
    this.mesh.instanceMatrix.needsUpdate = true;
    return index;
  }

  setColorAt(index, color) {
    this.mesh.setColorAt(index, color);
    this.mesh.instanceColor.needsUpdate = true;
  }

  syncInstance(index) {
    const entry = this.entries[index];
    if (!entry) return;
    this._pos.copy(entry.body.position);
    this._quat.copy(entry.body.quaternion);
    this._mat.compose(this._pos, this._quat, entry.scale);
    this.mesh.setMatrixAt(index, this._mat);
  }

  update() {
    for (let i = 0; i < this.entries.length; i++) {
      this.syncInstance(i);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // Forget all instances so the mesh can be refilled (rendered count -> 0).
  clear() {
    this.mesh.count = 0;
    this.entries = [];
  }
}

export default InstancedMeshGroup;
