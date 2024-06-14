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

    this.placeLoading();
    this.loadModels();
    // this.placePressEnter();
  }

  disappearLoading() {
    if (this.bodiesWhileLoading[0].position.z > -1.5) {
      for (let i = 0; i < this.bodiesWhileLoading.length; i++) {
        // console.log(this.bodiesWhileLoading[i].position.z);
        this.bodiesWhileLoading[i].position.z -= 0.02;
      }
    } else {
      while (this.bodiesWhileLoading.length > 0) {
        this.scene.remove(this.meshesWhileLoading.pop());
        this.world.removeBody(this.bodiesWhileLoading.pop());
      }
      this.progress[1] = false;
      return;
    }

    requestAnimationFrame(() => this.disappearLoading());
  }

  placeLetterCells(xoff, yoff, i, j) {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const cube = new THREE.Mesh(geometry, material);
    this.scene.add(cube);

    const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
    const body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
    });
    body.addShape(shape);
    body.position.set(xoff + i, yoff + j, 0);
    this.world.addBody(body);

    this.meshesWhileLoading.push(cube);
    this.bodiesWhileLoading.push(body);
  }

  placePressEnter() {
    let xoff = 0,
      yoff = 0;
    // P
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        if (i > -0.6 * 4) this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3);
    }

    // R
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        if (i > -0.6 * 4) this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3);
    }
    for (let i = 0.6 * 2; i < 0.6 * 6; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -i - 0.6 * 2);
    }

    // E
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 5; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0);
      if (i != 0.6 * 4) this.placeLetterCells(xoff, yoff, i, -0.6 * 3.5);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7);
    }

    // S
    xoff += 0.6 * 6;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        if (!(i < -0.6 * 3 && i > -0.6 * 6))
          this.placeLetterCells(xoff, yoff, j, i);
        if (!(i < -0.6 && i > -0.6 * 4))
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3.5);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7);
    }

    // S
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        if (!(i < -0.6 * 3 && i > -0.6 * 6))
          this.placeLetterCells(xoff, yoff, j, i);
        if (!(i < -0.6 && i > -0.6 * 4))
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3.5);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7);
    }

    // Enter Sign
    xoff += 0.6 * 9;
    for (let i = -0.6; i < 0.6 * 5; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -0.6 * 4);
    }
    for (let i = 0; i > -0.6 * 4; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j + 0.6 * 3, i);
      }
    }
    for (let i = 0; i < 0.6 * 2; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -i - 0.6 * 5);
      this.placeLetterCells(xoff, yoff, i, i - 0.6 * 3);
    }
  }

  placeLoading() {
    let xoff = 0,
      yoff = 0;

    //L
    for (let i = 0; i > -0.6 * 6; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
      }
    }
    for (let i = -0.6 * 6; i > -0.6 * 7; i -= 0.6) {
      for (let j = 0; j < 0.6 * 5; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
      }
    }

    // O
    xoff += 0.6 * 6;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 6; j += 0.6) {
        if (!(i < 0 && i > -0.6 * 7 && j > 0.6 && j < 0.6 * 4))
          this.placeLetterCells(xoff, yoff, j, i);
      }
    }

    // A
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i);
      }
    }
    for (let i = 0; i > -0.6; i -= 0.6) {
      for (let j = 0.6 * 2; j < 0.6 * 4; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        this.placeLetterCells(xoff, yoff, j, i - 0.6 * 3);
      }
    }

    // D
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        if (!((i == 0 || i == -0.6 * 7) && j == 0.6))
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i);
      }
    }
    for (let i = 0; i > -0.6; i -= 0.6) {
      for (let j = 0.6 * 2; j < 0.6 * 4; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        this.placeLetterCells(xoff, yoff, j, i - 0.6 * 7);
      }
    }

    // I
    xoff += 0.6 * 7;
    for (let j = 0; j < 0.6 * 5; j += 0.6) {
      this.placeLetterCells(xoff, yoff, j, 0);
      this.placeLetterCells(xoff, yoff, j, -0.6 * 7);
    }
    for (let i = -0.6; i > -0.6 * 7; i -= 0.6) {
      this.placeLetterCells(xoff, yoff, 0.6 * 2, i);
    }

    // N
    xoff += 0.6 * 6;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i);
        this.placeLetterCells(xoff, yoff, j + 0.6 * 5, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 5; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -i);
    }

    // G
    xoff += 0.6 * 8;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        if (i < -0.6 * 3 && !((i == -0.6 * 4 || i == -0.6 * 7) && j == 0.6))
          this.placeLetterCells(xoff, yoff, j + 0.6 * 5, i);
        if (!((i == 0 || i == -0.6 * 7) && j == 0))
          this.placeLetterCells(xoff, yoff, j, i);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 5; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7);
      this.placeLetterCells(xoff, yoff, i, 0);
    }
    for (let i = 0.6 * 3; i < 0.6 * 5; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -0.6 * 4);
    }
  }

  removeModels() {
    for (let i = 0; i < this.meshesWhileLoading.length; i++) {
      this.scene.remove(this.meshesWhileLoading[i]);
      this.world.removeBody(this.bodiesWhileLoading[i]);
    }
  }

  async modelAndProgressLoading(asset, xoff, yoff) {
    const model = await this.gltfLoader.loadAsync(`assets/${asset}.glb`);
    this.assets[asset] = model.scene.children[0];
    this.progress[0]++;
    for (let i = 0; i < 0.6 * 2; i += 0.6)
      this.placeLetterCells(
        xoff + this.progress[0] * 0.6 * 2,
        yoff,
        i,
        -0.6 * 9
      );
  }

  async loadModels() {
    const xoff = -0.6;

    await this.modelAndProgressLoading('brick', xoff, 0);
    await this.modelAndProgressLoading('apple tree', xoff, 0);
    await this.modelAndProgressLoading('apple tree stone', xoff, 0);
    await this.modelAndProgressLoading('stone1', xoff, 0);
    await this.modelAndProgressLoading('flashlight optimised', xoff, 0);
    await this.modelAndProgressLoading('gmail', xoff, 0);
    await this.modelAndProgressLoading('github', xoff, 0);
    await this.modelAndProgressLoading('linkedin', xoff, 0);
    await this.modelAndProgressLoading('playstore', xoff, 0);
    await this.modelAndProgressLoading('tree4ashoka', xoff, 0);
    await this.modelAndProgressLoading('bush', xoff, 0);
    await this.modelAndProgressLoading('dark bush', xoff, 0);
    await this.modelAndProgressLoading('fence 4 sticks', xoff, 0);
    await this.modelAndProgressLoading('stone combined 1', xoff, 0);
    await this.modelAndProgressLoading('left sign post', xoff, 0);
    await this.modelAndProgressLoading('android icon', xoff, 0);
    await this.modelAndProgressLoading('project landscape2', xoff, 0);
    await this.modelAndProgressLoading('screen and keyboard', xoff, 0);
    await this.modelAndProgressLoading('mouse', xoff, 0);
    await this.modelAndProgressLoading('cursor', xoff, 0);
    await this.modelAndProgressLoading('shop', xoff, 0);
    await this.modelAndProgressLoading('cannon', xoff, 0);
    await this.modelAndProgressLoading('teleporter', xoff, 0);

    this.progress[1] = true;
    this.disappearLoading();
  }
}

export default Loading;
