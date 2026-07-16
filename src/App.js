import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';

import PlaceContactLinks from './placeContactLinks';
import PlaceNameAndBackWall from './placeNameAndBackWall';
import PlaceProjects from './placeProjects';
import Loading from './Loading';
import PlaceAchievements from './placeAchievement';
import PlaceExperience from './placeExperience';
import { distance2D } from './utils';

const TIMESTEP = 1 / 60;

const LOADING_CUBE_COLORS = [
  new THREE.Color(0xffffe0), // Initial cube color
  new THREE.Color(0xffffff), // White
  new THREE.Color(0xff0000), // Red
  new THREE.Color(0xffff00), // Yellow
  new THREE.Color(0x00ff00), // Green
  new THREE.Color(0x0000ff), // Blue
  new THREE.Color(0xff00ff), // Magenta
  new THREE.Color(0x00ffff), // Cyan
  new THREE.Color(0x000000), // Black
];

class App {
  // graphics / physics
  camera;
  scene;
  renderer;
  world;
  orbit;
  listener;
  sound;
  gltfLoader = new GLTFLoader();

  // loading state
  meshesWhileLoading = [];
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

  // player
  meshes = [];
  bodies = [];
  ufobody;
  ufomesh;
  directionArrow;
  ufotoplight = new THREE.SpotLight(0xfdfa72, 550);
  dir = {
    right: false,
    left: false,
    forward: false,
    back: false,
    move: true,
  };
  speed = 0;
  maxSpeed = 0.5;
  maxAngularSpeed = 2;
  acceleration = 0.09;

  // camera state
  camZoomY = 0;
  camZoomZ = 0;
  repositioned = true;
  isPanning = false;
  startPan = new THREE.Vector2();

  async init() {
    window.addEventListener('resize', () => this.onWindowResize(), false);
    window.addEventListener('keydown', (e) => this.keydown(e), false);
    window.addEventListener('keyup', (e) => this.keyup(e), false);
    window.addEventListener('keypress', (e) => this.keypress(e), false);
    window.addEventListener('wheel', (e) => this.cameraZoom(e), false);
    window.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
    window.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    window.addEventListener('mouseup', (e) => this.onMouseUp(e), false);

    this.setUpGraphics();
    this.setupPhysicsWorld();

    this.touchControls();

    this.createGround();
    await this.player();

    this.loadingScene();
    this.loadingAnimation();
  }

  touchControls() {
    function isTouchDevice() {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    }

    if (!isTouchDevice()) {
      document.getElementById('vertical-controls').style.display = 'none';
      document.getElementById('controls').style.display = 'none';
    } else {
      this.camera.position.set(13, -23, 39);
    }

    let ufofront, ufoback;

    document.getElementById('upButton').addEventListener('touchstart', (e) => {
      e.preventDefault();
      ufofront = setInterval(() => {
        this.dir.back = true;
        this.speed -= this.acceleration;
      }, 1000 / 60);
    });

    document.getElementById('upButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      clearInterval(ufofront);
      this.dir.back = false;
      this.speed = 0;
    });

    document
      .getElementById('downButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        ufoback = setInterval(() => {
          this.dir.forward = true;
          this.speed += this.acceleration;
        }, 1000 / 60);
      });

    document.getElementById('downButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      clearInterval(ufoback);
      this.dir.forward = false;
      this.speed = 0;
    });

    document
      .getElementById('leftButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.dir.left = true;
      });

    document.getElementById('leftButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      this.dir.left = false;
    });

    document
      .getElementById('rightButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.dir.right = true;
      });

    document.getElementById('rightButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      this.dir.right = false;
    });

    document
      .getElementById('jumpButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (this.ufobody.position.z < this.camera.position.z - 5)
          this.ufobody.applyForce(new CANNON.Vec3(0, 0, 600));
      });

    document
      .getElementById('enterButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();

        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(enterEvent);
      });
  }

  loadingScene() {
    this.loadingSceneClass = new Loading(
      this.scene,
      this.world,
      this.meshesWhileLoading,
      this.bodiesWhileLoading,
      this.assets,
      this.progress,
      this
    );
  }

  placeContactLinksFun() {
    this.placeContactLinksClass = new PlaceContactLinks(
      this.scene,
      this.world,
      this.ufomesh,
      this.assets
    );
  }

  placeNameAndBackWallFun() {
    new PlaceNameAndBackWall(
      this.scene,
      this.world,
      this.meshes,
      this.bodies,
      this.assets
    );
  }

  placeProjectsFun() {
    this.placeProjectsClass = new PlaceProjects(
      this.scene,
      this.world,
      this.assets,
      this.ufobody,
      this.ufomesh,
      this.dir,
      this.camera,
      this.orbit
    );
  }

  placeAchievementsFun() {
    new PlaceAchievements(
      this.scene,
      this.world,
      this.meshes,
      this.bodies,
      this.assets
    );
  }

  placeExperienceFun() {
    this.placeExperienceClass = new PlaceExperience(
      this.scene,
      this.world,
      this.assets,
      this.ufobody
    );
  }

  setUpGraphics() {
    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      2000
    );
    this.camera.position.set(12.5, -14.5, 12.5 + 10);
    this.camera.rotation.set(0.74, 2.71, -2.511);

    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.sound = new THREE.Audio(this.listener);

    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.target.set(12.5, -7.8, 3.42 + 10);
    this.orbit.enableRotate = false;
    this.orbit.enableZoom = false;
    this.orbit.enablePan = false;
    this.orbit.update();

    const ambientLight = new THREE.HemisphereLight(0xffffbb, 0x080820);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(-45, 50, 60);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    directionalLight.shadow.camera.left = 100;
    directionalLight.shadow.camera.right = -100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.3);
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
    const planeMat = new THREE.MeshStandardMaterial({
      color: 0x70ac29,
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
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

  async player() {
    this.ufobody = new CANNON.Body({
      mass: 2,
      linearDamping: 0.8,
      angularDamping: 0.99,
    });
    this.ufobody.position.set(0, -4, 12);

    this.ufobody.addShape(
      new CANNON.Cylinder(0.5, 0.5, 0.25, 8),
      new CANNON.Vec3(),
      new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0)
    );
    this.world.addBody(this.ufobody);

    const ufoLoaded = await this.gltfLoader.loadAsync('assets/ufo2glb.glb');
    this.ufomesh = ufoLoaded.scene.children[0];
    this.ufomesh.position.set(0, 0, 0);
    this.ufomesh.castShadow = true;
    this.ufomesh.children.forEach((child) => {
      child.castShadow = true;
    });

    const arrowLoaded = await this.gltfLoader.loadAsync('assets/cursor.glb');
    this.directionArrow = arrowLoaded.scene.children[0];
    this.directionArrow.position.set(0, 0, 2);
    this.directionArrow.scale.set(12, 6, 6);
    this.directionArrow.visible = false;
    this.ufomesh.add(this.directionArrow);

    this.ufotoplight.penumbra = 1;
    this.moveSpotlightToCamera();
    this.scene.add(this.ufotoplight);
    this.scene.add(this.ufotoplight.target);

    this.scene.add(this.ufomesh);

    this.meshes.push(this.ufomesh);
    this.bodies.push(this.ufobody);
    this.ufobody.quaternion.setFromEuler(0, 0, Math.PI);
    this.ufobody.applyForce(new CANNON.Vec3(2500, 0, 0));
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Keeps the UFO spotlight glued to the camera position.
  moveSpotlightToCamera() {
    this.ufotoplight.position.set(
      this.camera.position.x,
      this.camera.position.y,
      this.camera.position.z
    );
    this.ufotoplight.target.position.set(
      this.camera.position.x,
      this.camera.position.y,
      0
    );
  }

  animate() {
    this.world.step(TIMESTEP);
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i].position.copy(this.bodies[i].position);
      this.meshes[i].quaternion.copy(this.bodies[i].quaternion);
    }

    this.moveUfo();
    this.floatUfo();
    if (
      Math.abs(this.ufobody.velocity.x) >= 0.1 ||
      Math.abs(this.ufobody.velocity.y) >= 0.1
    ) {
      if (!this.repositioned) {
        new TWEEN.Tween(this.camera.position)
          .to(
            {
              x: this.ufobody.position.x,
              y: this.ufobody.position.y - 9 + this.camZoomY,
              z: 12 + this.camZoomZ,
            },
            500
          )
          .easing(TWEEN.Easing.Quadratic.InOut)
          .onComplete(() => {
            this.repositioned = true;
          })
          .start();
      } else {
        this.followCamera();
      }
    }

    this.checkIfLost();

    this.placeContactLinksClass.update();
    this.placeProjectsClass.update();
    this.placeExperienceClass.update();

    TWEEN.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.animate());
  }

  checkIfLost() {
    if (distance2D({ x: -10, y: -10 }, this.ufomesh.position) > 50) {
      this.directionArrow.lookAt(0, 0, 0);
      this.directionArrow.visible = true;
    } else {
      this.directionArrow.visible = false;
    }
  }

  floatUfo() {
    const result = new CANNON.RaycastResult();
    this.world.raycastClosest(
      this.ufobody.position.vadd(new CANNON.Vec3(0, 0, -0.6)),
      this.ufobody.position.vadd(new CANNON.Vec3(0, 0, -50)),
      {},
      result
    );
    if (result.hasHit) {
      const dis = result.distance;
      const force = (1 / dis) * 17;
      this.ufobody.applyForce(new CANNON.Vec3(0, 0, force >= 27 ? 27 : force));
    } else {
      this.ufobody.applyForce(new CANNON.Vec3(0, 0, 27));
    }

    // floating mechanics
    const maxTorqueAngle = (7 / 180) * Math.PI;
    const torqueVal = 25 * maxTorqueAngle * 2;
    if (this.ufobody.angularVelocity.almostZero(0.5)) {
      if (this.ufobody.quaternion.x > maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(-torqueVal, 0, 0));
      }
      if (this.ufobody.quaternion.x < -maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(torqueVal, 0, 0));
      }
      if (this.ufobody.quaternion.y > maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(0, -torqueVal, 0));
      }
      if (this.ufobody.quaternion.y < -maxTorqueAngle) {
        this.ufobody.applyTorque(new CANNON.Vec3(0, torqueVal, 0));
      }
    }
  }

  onMouseDown(event) {
    if (event.button === 0) {
      this.isPanning = true;
      this.startPan.set(event.clientX, event.clientY);
    }
  }

  onMouseMove(event) {
    if (!this.isPanning) return;
    if (!this.enterKeyPressed) return;
    if (
      Math.abs(this.ufobody.velocity.x) >= 0.1 ||
      Math.abs(this.ufobody.velocity.y) >= 0.1
    )
      return;
    this.repositioned = false;

    const panEnd = new THREE.Vector2(event.clientX, event.clientY);
    const panDelta = new THREE.Vector2().subVectors(panEnd, this.startPan);
    const panSpeed = 0.01;
    this.orbit.target.x -= panDelta.x * panSpeed;
    this.orbit.target.y += panDelta.y * panSpeed;
    this.camera.position.x -= panDelta.x * panSpeed;
    this.camera.position.y += panDelta.y * panSpeed;

    this.startPan.copy(panEnd);
    this.orbit.update();

    this.moveSpotlightToCamera();
  }

  onMouseUp(event) {
    if (event.button === 0) {
      this.isPanning = false;
    }
  }

  cameraZoom(event) {
    if (!this.repositioned) return;
    if (!this.enterKeyPressed) return;
    const delta = event.deltaY * 0.01;
    this.camZoomY += delta;
    this.camZoomZ -= delta;
    if (this.camZoomY > 3) {
      this.camZoomY = 3;
      this.camZoomZ = -3;
      return;
    }
    if (this.camZoomY < -6) {
      this.camZoomY = -6;
      this.camZoomZ = 6;
      return;
    }
    this.camera.position.set(
      this.ufobody.position.x,
      this.ufobody.position.y - 9 + this.camZoomY,
      12 + this.camZoomZ
    );
    this.orbit.update();

    this.moveSpotlightToCamera();
  }

  keydown(event) {
    const key = event.key.toLowerCase();
    if (key === 'd' || key === 'arrowright') {
      this.dir.right = true;
    }
    if (key === 'a' || key === 'arrowleft') {
      this.dir.left = true;
    }
    if (key === 's' || key === 'arrowdown' || this.dir.forward) {
      this.dir.forward = true;
      this.speed += this.acceleration;
    }
    if (key === 'w' || key === 'arrowup' || this.dir.back) {
      this.dir.back = true;
      this.speed -= this.acceleration;
    }
  }

  keyup(event) {
    const key = event.key.toLowerCase();
    if (key === 'd' || key === 'arrowright') this.dir.right = false;
    if (key === 'a' || key === 'arrowleft') this.dir.left = false;
    if (key === 's' || key === 'arrowdown') {
      this.dir.forward = false;
      this.speed = 0;
    }
    if (key === 'w' || key === 'arrowup') {
      this.dir.back = false;
      this.speed = 0;
    }
  }

  keypress(event) {
    const key = event.key.toLowerCase();

    if (key === ' ') {
      if (this.ufobody.position.z < this.camera.position.z - 5)
        this.ufobody.applyForce(new CANNON.Vec3(0, 0, 600));
    }
  }

  applyLocalVelocity(body, localVelocity) {
    const worldVelocityVec3 = new CANNON.Vec3();

    // Rotate local velocity vector to world space using the body's quaternion
    body.quaternion.vmult(localVelocity, worldVelocityVec3);

    // Add the transformed velocity to the body's current velocity
    body.velocity.x += worldVelocityVec3.x;
    body.velocity.y += worldVelocityVec3.y;
  }

  moveUfo() {
    if (this.dir.move) {
      if (this.dir.forward) {
        if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
        this.applyLocalVelocity(
          this.ufobody,
          new CANNON.Vec3(0, this.speed, 0)
        );
      }

      if (this.dir.back) {
        if (this.speed < -this.maxSpeed) this.speed = -this.maxSpeed;
        this.applyLocalVelocity(
          this.ufobody,
          new CANNON.Vec3(0, this.speed, 0)
        );
      }

      if (
        this.ufobody.angularVelocity.length() < this.maxAngularSpeed &&
        this.dir.left
      ) {
        this.ufobody.angularVelocity.z += 1.5;
      }

      if (
        this.ufobody.angularVelocity.length() < this.maxAngularSpeed &&
        this.dir.right
      ) {
        this.ufobody.angularVelocity.z -= 1.5;
      }
    }
  }

  followCamera() {
    this.orbit.target.set(
      this.ufobody.position.x,
      this.ufobody.position.y,
      0.5
    );
    this.camera.position.set(
      this.ufobody.position.x,
      this.ufobody.position.y - 9 + this.camZoomY,
      12 + this.camZoomZ
    );
    this.orbit.update();
    this.moveSpotlightToCamera();
  }

  loadingAnimation() {
    this.world.step(TIMESTEP);

    if (this.enterKeyPressed) return;

    if (!this.progress[1]) {
      // if not pause loading animation
      for (let i = 0; i < this.bodiesWhileLoading.length; i++) {
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(
          this.bodiesWhileLoading[i].position.vadd(new CANNON.Vec3(0, 0, 0.6)),
          this.bodiesWhileLoading[i].position.vadd(new CANNON.Vec3(0, 0, 50)),
          {},
          result
        );

        const threshold = -0.5 + 10;
        if (result.hasHit) {
          if (this.bodiesWhileLoading[i].position.z > threshold) {
            this.bodiesWhileLoading[i].position.z -= 0.05;
          }
          if (
            LOADING_CUBE_COLORS.find((e) =>
              e.equals(this.meshesWhileLoading[i].material.color)
            )
          ) {
            this.meshesWhileLoading[i].material.color.lerp(
              LOADING_CUBE_COLORS[Math.floor(Math.random() * 8)],
              Math.random()
            );
          }
        } else {
          if (this.bodiesWhileLoading[i].position.z < 0 + 10) {
            this.bodiesWhileLoading[i].position.z += 0.03;
          }
        }

        this.meshesWhileLoading[i].position.copy(
          this.bodiesWhileLoading[i].position
        );
      }
    } else {
      for (let i = 0; i < this.bodiesWhileLoading.length; i++) {
        this.meshesWhileLoading[i].position.copy(
          this.bodiesWhileLoading[i].position
        );
      }
    }

    this.ufomesh.position.copy(this.ufobody.position);
    this.ufomesh.quaternion.copy(this.ufobody.quaternion);
    this.moveUfo();
    this.floatUfo();

    if (this.progress[1] && !this.animationLoaded) {
      this.animationLoaded = true;
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.enterKeyPressed) {
          this.startMainScene();
        }
      });
    }

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.loadingAnimation());
  }

  startMainScene() {
    if (this.listener.context.state === 'suspended') {
      this.listener.context.resume().then(() => {
        this.playAudio();
      });
    } else {
      this.playAudio();
    }

    this.enterKeyPressed = true;
    this.loadingSceneClass.removeModels(true);

    this.ufobody.position.set(-2, 0, 12);

    this.orbit.target.set(
      this.ufobody.position.x,
      this.ufobody.position.y,
      0.5
    );
    this.camera.position.set(
      this.ufobody.position.x,
      this.ufobody.position.y - 9,
      12
    );
    this.orbit.update();
    this.moveSpotlightToCamera();

    this.animate();
  }

  playAudio() {
    this.sound.setBuffer(this.assets['gamestart']);
    this.sound.setLoop(false);
    this.sound.setVolume(0.8);
    this.sound.play();

    setTimeout(() => {
      this.sound.stop();
      this.sound.setBuffer(this.assets['backgroundmusic']);
      this.sound.setLoop(true);
      this.sound.setVolume(0.1);
      this.sound.play();
    }, 1500);
  }
}

export default App;
