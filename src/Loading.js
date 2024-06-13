import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';

class Loading {
  scene;
  world;
  gltfLoader;
  meshesWhileLoading;
  bodiesWhileLoading;
  assets;
  progress;

  constructor(
    scene,
    world,
    meshesWhileLoading,
    bodiesWhileLoading,
    assets,
    progress
  ) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.meshesWhileLoading = meshesWhileLoading;
    this.bodiesWhileLoading = bodiesWhileLoading;
    this.assets = assets;
    this.progress = progress;

    // this.placeModels();
  }

  placeModels() {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const cube = new THREE.Mesh(geometry, material);
        this.scene.add(cube);

        const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        const body = new CANNON.Body({
          type: CANNON.Body.KINEMATIC,
        });
        body.addShape(shape);
        body.position.set(i, j, 0);
        this.world.addBody(body);

        this.meshesWhileLoading.push(cube);
        this.bodiesWhileLoading.push(body);
      }
    }

    this.loadModels();
  }

  removeModels() {
    for (let i = 0; i < this.meshesWhileLoading.length; i++) {
      this.scene.remove(this.meshesWhileLoading[i]);
      this.world.removeBody(this.bodiesWhileLoading[i]);
    }
  }

  async loadModels() {
    let model;
    model = await this.gltfLoader.loadAsync(`assets/brick.glb`);
    this.assets['brick'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/apple tree.glb`);
    this.assets['apple tree'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/apple tree stone.glb`);
    this.assets['apple tree stone'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/stone1.glb`);
    this.assets['stone1'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/flashlight optimised.glb`);
    this.assets['flashlight optimised'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/gmail.glb`);
    this.assets['gmail'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/github.glb`);
    this.assets['github'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/linkedin.glb`);
    this.assets['linkedin'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/playstore.glb`);
    this.assets['playstore'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/tree4ashoka.glb`);
    this.assets['tree4ashoka'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/bush.glb`);
    this.assets['bush'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/dark bush.glb`);
    this.assets['dark bush'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/fence 4 sticks.glb`);
    this.assets['fence 4 sticks'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/stone combined 1.glb`);
    this.assets['stone combined 1'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/left sign post.glb`);
    this.assets['left sign post'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/android icon.glb`);
    this.assets['android icon'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/project landscape2.glb`);
    this.assets['project landscape2'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/screen and keyboard.glb`);
    this.assets['screen and keyboard'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/mouse.glb`);
    this.assets['mouse'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/cursor.glb`);
    this.assets['cursor'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/shop.glb`);
    this.assets['shop'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/cannon.glb`);
    this.assets['cannon'] = model.scene.children[0];
    this.progress[0]++;

    model = await this.gltfLoader.loadAsync(`assets/teleporter.glb`);
    this.assets['teleporter'] = model.scene.children[0];
    this.progress[0]++;
  }
}

export default Loading;
