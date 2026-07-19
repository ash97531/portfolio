import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Shared loader for all GLBs. The assets are compressed with
// KHR_draco_mesh_compression (gltf-transform draco). Draco decodes back to
// the original float positions inside each primitive, so the scene-graph
// node transforms are untouched — important because placeGLBMesh overwrites
// node position/rotation/scale on load.
const dracoLoader = new DRACOLoader();
// decoder files live in app/draco/, next to index.html
dracoLoader.setDecoderPath('draco/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

export default gltfLoader;
