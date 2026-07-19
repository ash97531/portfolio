import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';

import PlaceContactLinks from './placeContactLinks';
import PlaceNameAndBackWall from './placeNameAndBackWall';
import PlaceProjects from './placeProjects';
import Loading from './Loading';
import PlaceAchievements from './placeAchievement';
import PlaceExperience from './placeExperience';
import Player from './Player';
import CameraRig from './CameraRig';
import InputManager from './InputManager';
import AudioManager from './AudioManager';
import PostProcessing from './PostProcessing';
import createGradientMaterial from './GradientMaterial';

const TIMESTEP = 1 / 60;

class App {
  scene;
  renderer;
  world;

  cameraRig;
  audio;
  player;
  input;
  postProcessing;

  // loading state
  bodiesWhileLoading = [];
  progress = [0, false]; // first index for progress, second for pause loading
  assets = {};
  loadingSceneClass;
  animationLoaded = false;
  enterKeyPressed = false;

  // world sections
  placeContactLinksClass;
  placeProjectsClass;
  placeExperienceClass;
  placeNameAndBackWallClass;
  placeAchievementsClass;

  // synced mesh/body pairs (bricks, letters, flashlights, the UFO, ...)
  meshes = [];
  bodies = [];

  async init() {
    window.__app = this; // TEMP debug handle, remove
    window.addEventListener('resize', () => this.onWindowResize(), false);

    this.setUpGraphics();
    this.cameraRig = new CameraRig(this);
    this.postProcessing = new PostProcessing(
      this.renderer,
      this.scene,
      this.cameraRig.camera,
    );
    this.audio = new AudioManager(this.cameraRig.camera);
    this.setupPhysicsWorld();
    this.createGround();

    this.player = new Player(this.scene, this.world);
    await this.player.init();
    this.meshes.push(this.player.ufomesh);
    this.bodies.push(this.player.ufobody);

    this.input = new InputManager(this);

    this.loadingScene();
    this.loadingAnimation();
  }

  loadingScene() {
    this.loadingSceneClass = new Loading(
      this.scene,
      this.world,
      this.bodiesWhileLoading,
      this.assets,
      this.progress,
      this,
    );
  }

  placeContactLinksFun() {
    this.placeContactLinksClass = new PlaceContactLinks(
      this.scene,
      this.world,
      this.player.ufomesh,
      this.assets,
    );
  }

  placeNameAndBackWallFun() {
    this.placeNameAndBackWallClass = new PlaceNameAndBackWall(
      this.scene,
      this.world,
      this.meshes,
      this.bodies,
      this.assets,
    );
  }

  placeProjectsFun() {
    this.placeProjectsClass = new PlaceProjects(
      this.scene,
      this.world,
      this.assets,
      this.player.ufobody,
      this.player.ufomesh,
      this.player.dir,
      this.cameraRig.camera,
      this.cameraRig.orbit,
    );
  }

  placeAchievementsFun() {
    this.placeAchievementsClass = new PlaceAchievements(
      this.scene,
      this.world,
      this.meshes,
      this.bodies,
      this.assets,
    );
  }

  placeExperienceFun() {
    this.placeExperienceClass = new PlaceExperience(
      this.scene,
      this.world,
      this.assets,
      this.player.ufobody,
    );
  }

  setUpGraphics() {
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // cap at 2: 3x-density phone screens cost ~2.25x the pixels for no
    // visible gain
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);

    // Kept low: MeshToonMaterial only routes direct (directional) light
    // through the warm/cool gradient ramp - ambient/hemisphere light adds
    // on top of that uncapped, so a bright ambient washes out the gradient
    // shading and reads as flat/overbright regardless of directional
    // intensity.
    const ambientLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.35);
    this.scene.add(ambientLight);

    // the only shadow-casting light in the scene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(-45, 50, 60);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    directionalLight.shadow.camera.left = 100;
    directionalLight.shadow.camera.right = -100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    // sharper shadows (default map is 512x512) and a tighter depth range
    directionalLight.shadow.mapSize.set(1024, 1024);
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 250;

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(0, -20, 10);
    directionalLight2.target.position.set(0, 0, 0);
    this.scene.add(directionalLight2);
  }

  setupPhysicsWorld() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.81) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.solver.iterations = 10; // Set solver iterations for stability

    this.world.allowSleep = true;
  }

  createGround() {
    const planeGeo = new THREE.BoxGeometry(1000, 1000, 0.5);
    const planeMat = createGradientMaterial({
      color: 0x70ac29,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.name = 'ground';
    planeMesh.receiveShadow = true;
    this.scene.add(planeMesh);

    const planePhysMat = new CANNON.Material();
    const planeBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(500, 500, 0.25)),
      material: planePhysMat,
    });
    planeBody.position.set(0, 0, -1);
    planeMesh.position.copy(planeBody.position);
    this.world.addBody(planeBody);
  }

  onWindowResize() {
    this.cameraRig.camera.aspect = window.innerWidth / window.innerHeight;
    this.cameraRig.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.postProcessing.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    this.world.step(TIMESTEP);
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i].position.copy(this.bodies[i].position);
      this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
    }

    this.player.moveUfo();
    this.player.floatUfo();
    this.player.updateBullets(TIMESTEP);
    this.cameraRig.update(this.player);
    this.player.checkIfLost();

    this.placeContactLinksClass.update();
    this.placeProjectsClass.update();
    this.placeExperienceClass.update();
    this.placeNameAndBackWallClass?.update();
    this.placeAchievementsClass?.update();

    TWEEN.update();
    this.postProcessing.render();
    requestAnimationFrame(() => this.animate());
  }

  loadingAnimation() {
    this.world.step(TIMESTEP);

    if (this.enterKeyPressed) return;

    if (!this.progress[1]) {
      // if not pause loading animation
      const result = new CANNON.RaycastResult();
      for (let i = 0; i < this.bodiesWhileLoading.length; i++) {
        result.reset();
        this.world.raycastClosest(
          this.bodiesWhileLoading[i].position.vadd(new CANNON.Vec3(0, 0, 0.6)),
          this.bodiesWhileLoading[i].position.vadd(new CANNON.Vec3(0, 0, 50)),
          {},
          result,
        );

        const threshold = -0.5 + 10;
        if (result.hasHit) {
          if (this.bodiesWhileLoading[i].position.z > threshold) {
            this.bodiesWhileLoading[i].position.z -= 0.05;
          }
          this.loadingSceneClass.lerpCellColorOnce(i);
        } else {
          if (this.bodiesWhileLoading[i].position.z < 0 + 10) {
            this.bodiesWhileLoading[i].position.z += 0.03;
          }
        }
      }
    }
    // draw all letter cells at their body positions (single instanced mesh)
    this.loadingSceneClass.letterCells.update();

    this.player.syncMeshToBody();
    this.player.moveUfo();
    this.player.floatUfo();
    this.player.updateBullets(TIMESTEP);

    // Once loading completes, InputManager's Enter handler may start the game.
    if (this.progress[1] && !this.animationLoaded) {
      this.animationLoaded = true;
    }

    this.postProcessing.render();
    requestAnimationFrame(() => this.loadingAnimation());
  }

  startMainScene() {
    this.audio.start(this.assets);

    this.enterKeyPressed = true;
    this.loadingSceneClass.removeModels(true);

    this.player.ufobody.position.set(-2, 0, 12);
    this.cameraRig.snapToUfo(this.player);

    this.animate();
  }
}

export default App;
