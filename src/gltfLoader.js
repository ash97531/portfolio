import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Shared loader for all GLBs. The assets are compressed with
// EXT_meshopt_compression (gltf-transform meshopt), so the decoder is
// required to read them.
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

export default gltfLoader;
