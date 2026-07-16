import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { FontLoader, TextGeometry } from 'three/examples/jsm/Addons.js';

// Assets load group by group (models within a group load in parallel);
// after each group finishes, its world section is placed via the App hooks.
const LOADING_SEQUENCE = [
  {
    glbs: [
      'brick',
      'apple tree',
      'apple tree stone',
      'stone1',
      'stone24',
      'flashlight optimised',
      'tree4ashoka',
      'india map',
    ],
    place: (app) => app.placeNameAndBackWallFun(),
  },
  {
    glbs: ['bush', 'dark bush', 'fence 4 sticks', 'stone combined 1'],
  },
  {
    glbs: ['gmail', 'github', 'linkedin', 'playstore'],
    place: (app) => app.placeContactLinksFun(),
  },
  {
    fonts: ['Gudea_Regular', 'Chela One_Regular'],
    sounds: {
      gamestart: 'sounds/game start.mp3',
      backgroundmusic: 'sounds/background 2.mp3',
    },
  },
  {
    glbs: [
      'left sign post',
      'android icon',
      'project landscape2',
      'screen and keyboard',
      'mouse',
      'cursor',
      'shop',
      'cannon',
      'teleporter',
      'bitcoin',
      'blockchain',
      'experience button',
    ],
    place: (app) => {
      app.placeProjectsFun();
      app.placeExperienceFun();
    },
  },
  {
    glbs: ['trophy', 'archery skills'],
    place: (app) => app.placeAchievementsFun(),
  },
];

class Loading {
  scene;
  world;
  gltfLoader;
  fontLoader;
  audioLoader;
  meshesWhileLoading;
  bodiesWhileLoading;
  assets;
  progress;
  app; // the running App instance; used to place world sections as assets arrive
  loadingSceneMeshes = [];
  loadingSceneBodies = [];

  constructor(
    scene,
    world,
    meshesWhileLoading,
    bodiesWhileLoading,
    assets,
    progress,
    app
  ) {
    this.scene = scene;
    this.world = world;
    this.gltfLoader = new GLTFLoader();
    this.fontLoader = new FontLoader();
    this.audioLoader = new THREE.AudioLoader();
    this.meshesWhileLoading = meshesWhileLoading;
    this.bodiesWhileLoading = bodiesWhileLoading;
    this.assets = assets;
    this.progress = progress;
    this.app = app;

    this.createGround();
    this.placeLoading();
    this.placeInstructions();
    this.loadModels();
  }

  createGround() {
    const planeGeo = new THREE.BoxGeometry(1000, 1000, 0.5);
    //E7A752
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x70ac29,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.receiveShadow = true;
    this.loadingSceneMeshes.push(planeMesh);
    this.scene.add(planeMesh);

    const planePhysMat = new CANNON.Material();
    const planeBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(500, 500, 0.25)),
      material: planePhysMat,
    });
    planeBody.position.set(0, 0, 9);
    planeMesh.position.copy(planeBody.position);
    this.loadingSceneBodies.push(planeBody);
    this.world.addBody(planeBody);
  }

  appearPressEnter() {
    if (this.bodiesWhileLoading[0].position.z < 0) {
      for (let i = 0; i < this.bodiesWhileLoading.length; i++) {
        this.bodiesWhileLoading[i].position.z += 0.02;
      }
    } else {
      this.progress[1] = false;
      return;
    }
    requestAnimationFrame(() => this.appearPressEnter());
  }

  disappearLoading() {
    if (this.bodiesWhileLoading[0].position.z > -1.5 + 10) {
      for (let i = 0; i < this.bodiesWhileLoading.length; i++) {
        this.bodiesWhileLoading[i].position.z -= 0.02;
      }
    } else {
      this.removeModels();

      this.placePressEnter();
      this.appearPressEnter();
      return;
    }

    requestAnimationFrame(() => this.disappearLoading());
  }

  placeLetterCells(xoff, yoff, i, j, z = 0) {
    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffe0 });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    this.scene.add(cube);

    const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
    const body = new CANNON.Body({
      type: CANNON.Body.KINEMATIC,
    });
    body.addShape(shape);
    body.position.set(xoff + i, yoff + j, z + 10);
    this.world.addBody(body);

    this.meshesWhileLoading.push(cube);
    this.bodiesWhileLoading.push(body);
  }

  placePressEnter() {
    let xoff = 0,
      yoff = 0,
      zoff = -1.5;
    // P
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i, zoff);
        if (i > -0.6 * 4)
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i, zoff);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3, zoff);
    }

    // R
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i, zoff);
        if (i > -0.6 * 4)
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i, zoff);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3, zoff);
    }
    for (let i = 0.6 * 2; i < 0.6 * 6; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -i - 0.6 * 2, zoff);
    }

    // E
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j, i, zoff);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 5; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0, zoff);
      if (i != 0.6 * 4) this.placeLetterCells(xoff, yoff, i, -0.6 * 3.5, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7, zoff);
    }

    // S
    xoff += 0.6 * 6;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        if (!(i < -0.6 * 3 && i > -0.6 * 6))
          this.placeLetterCells(xoff, yoff, j, i, zoff);
        if (!(i < -0.6 && i > -0.6 * 4))
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i, zoff);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3.5, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7, zoff);
    }

    // S
    xoff += 0.6 * 7;
    for (let i = 0; i > -0.6 * 8; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        if (!(i < -0.6 * 3 && i > -0.6 * 6))
          this.placeLetterCells(xoff, yoff, j, i, zoff);
        if (!(i < -0.6 && i > -0.6 * 4))
          this.placeLetterCells(xoff, yoff, j + 0.6 * 4, i, zoff);
      }
    }
    for (let i = 0.6 * 2; i < 0.6 * 4; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, 0, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 3.5, zoff);
      this.placeLetterCells(xoff, yoff, i, -0.6 * 7, zoff);
    }

    // Enter Sign
    xoff += 0.6 * 11;
    for (let i = -0.6; i < 0.6 * 7; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -0.6 * 4, zoff);
    }
    for (let i = 0; i > -0.6 * 4; i -= 0.6) {
      for (let j = 0; j < 0.6 * 2; j += 0.6) {
        this.placeLetterCells(xoff, yoff, j + 0.6 * 5, i, zoff);
      }
    }
    for (let i = 0; i < 0.6 * 2; i += 0.6) {
      this.placeLetterCells(xoff, yoff, i, -i - 0.6 * 5, zoff);
      this.placeLetterCells(xoff, yoff, i, i - 0.6 * 3, zoff);
    }
  }

  placeInstructions() {
    const loader = new FontLoader();
    loader.load('./fonts/Coffee Spark_Regular.json', (font) => {
      const geometry = new TextGeometry(
        '- Press  W,A,S,D  for movement\n- Press  SPACE  to jump\n- Press ENTER to start',
        {
          font: font,
          size: 0.8,
          depth: 0.5,
          curveSegments: 12,
          bevelEnabled: false,
        }
      );
      const material = new THREE.MeshBasicMaterial({ color: 0xadff2f });
      const instructionText = new THREE.Mesh(geometry, material);
      instructionText.position.set(0.6 * 5, -0.6 * 13, -1.1 + 10);
      instructionText.castShadow = true;
      this.loadingSceneMeshes.push(instructionText);
      this.scene.add(instructionText);
    });
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

  removeModels(enterMainScene = false) {
    while (this.bodiesWhileLoading.length > 0) {
      this.scene.remove(this.meshesWhileLoading.pop());
      this.world.removeBody(this.bodiesWhileLoading.pop());
    }
    if (enterMainScene) {
      while (this.loadingSceneMeshes.length > 0)
        this.scene.remove(this.loadingSceneMeshes.pop());
      while (this.loadingSceneBodies.length > 0)
        this.world.removeBody(this.loadingSceneBodies.pop());
    }
  }

  async modelAndProgressLoading(asset, xoff, yoff) {
    const model = await this.gltfLoader.loadAsync(`assets/${asset}.glb`);
    this.assets[asset] = model.scene.children[0];
    this.progress[0]++;
    for (let i = 0; i < 0.6; i += 0.6)
      this.placeLetterCells(
        xoff + this.progress[0] * 0.6 * 1.5 + 0.6,
        yoff,
        i,
        -0.6 * 9
      );
  }

  async loadModels() {
    const xoff = -0.6;

    for (const group of LOADING_SEQUENCE) {
      if (group.glbs) {
        await Promise.all(
          group.glbs.map((name) => this.modelAndProgressLoading(name, xoff, 0))
        );
      }
      if (group.fonts) {
        for (const font of group.fonts) {
          this.assets[font] = await this.fontLoader.loadAsync(
            `./fonts/${font}.json`
          );
        }
      }
      if (group.sounds) {
        for (const [name, path] of Object.entries(group.sounds)) {
          this.assets[name] = await this.audioLoader.loadAsync(path);
        }
      }
      if (group.place) group.place(this.app);
    }

    this.progress[1] = true;
    this.disappearLoading();
  }
}

export default Loading;
