import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'dat.gui';

import PlaceContactLinks from './placeContactLinks';
import PlaceNameAndBackWall from './placeNameAndBackWall';
import PlaceProjects from './placeProjects';
import Compass from './compass';
import Loading from './Loading';
import PlaceAchievements from './placeAchievement';
import PlaceExperience from './placeExperience';

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

let meshesWhileLoading = [],
  bodiesWhileLoading = [];
let progress = [0, false]; // first index for progress, second for pause loading
let assets = {};
let loadingSceneClass;
const totalAssets = 29;

let placeContactLinksClass, placeProjectsClass, placeExperienceClass;

let camera, scene, renderer, world, labelRenderer, orbit;
let meshes = [],
  bodies = [];
let ufobody, ufomesh;
let cannondebugger;
let dir = {
  right: false,
  left: false,
  forward: false,
  back: false,
  move: true,
};
const gltfLoader = new GLTFLoader();
let speed = 0,
  maxSpeed = 0.5,
  maxAngularSpeed = 2,
  acceleration = 0.09;
let buttonArray = [];
const colorsArr = [
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
let nebula;
const gui = new GUI();

let enterKeyPressed = false;

let ufotoplighthelper;
class App {
  async init() {
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', keydown, false);
    window.addEventListener('keyup', keyup, false);

    this.setUpGraphics();
    this.setupPhysicsWorld();

    this.createGround();
    await this.player();

    this.loadingScene();
    loadingAnimation();

    // this.placeScenes();
    // animate();
  }

  loadingScene() {
    loadingSceneClass = new Loading(
      scene,
      world,
      meshesWhileLoading,
      bodiesWhileLoading,
      assets,
      progress
    );
  }

  placeScenes() {
    placeContactLinksClass = new PlaceContactLinks(
      scene,
      world,
      ufomesh,
      assets
    );
    new PlaceNameAndBackWall(scene, world, meshes, bodies, assets);
    placeProjectsClass = new PlaceProjects(
      scene,
      world,
      assets,
      ufobody,
      ufomesh,
      dir
    );
    new PlaceAchievements(scene, world, meshes, bodies, assets);
    placeExperienceClass = new PlaceExperience(scene, world, assets, ufobody);
  }

  async placeGLBMesh(
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
    shadow = true
  ) {
    const objectLoaded = await gltfLoader.loadAsync(`assets/${path}.glb`);
    let objectMesh = objectLoaded.scene.children[0];
    objectMesh.position.set(x, y, z);
    objectMesh.scale.set(sx, sy, sz);
    objectMesh.castShadow = true;
    objectMesh.receiveShadow = shadow;
    objectMesh.rotation.set(rx, ry, rz);

    return objectMesh;
  }

  placeGlbToCannonBody(mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const boxShape = new CANNON.Box(
      new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)
    );
    const cannonBody = new CANNON.Body({
      mass: 0.2, // kg
    });
    cannonBody.allowSleep = true;
    cannonBody.sleepSpeedLimit = 0.1;
    cannonBody.sleepTimeLimit = 0.5;
    cannonBody.addShape(boxShape);
    cannonBody.position.set(x, y, z);
    cannonBody.quaternion.setFromEuler(rx, ry, rz);
    return cannonBody;
  }

  setUpGraphics() {
    camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      2000
    );
    camera.position.set(11.5, -14.5, 12.5 + 10);
    // camera.position.set(15.3, -3.5, 5.7);
    // camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.rotation.set(0.74, 2.71, -2.511);

    scene = new THREE.Scene();
    // scene.fog = new THREE.FogExp2(0xcccccc, 0.018);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);

    orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(11.5, -7.8, 3.42 + 10);
    orbit.update();

    const ambientLight = new THREE.HemisphereLight(0xffffbb, 0x080820);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
    directionalLight.position.set(-45, 50, 60);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    directionalLight.shadow.camera.left = 100;
    directionalLight.shadow.camera.right = -100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.3);
    directionalLight2.position.set(0, -20, 10);
    directionalLight2.target.position.set(0, 0, 0);
    scene.add(directionalLight2);
  }

  setupPhysicsWorld() {
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.81) });
    world.broadphase = new CANNON.SAPBroadphase(world); // Use SAP broadphase
    world.solver.iterations = 10; // Set solver iterations for stability

    world.allowSleep = true;
    cannondebugger = new CannonDebugger(scene, world);
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
    scene.add(planeMesh);

    const planePhysMat = new CANNON.Material();
    const planeBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(500, 500, 0.25)),
      material: planePhysMat,
    });
    planeBody.position.set(0, 0, -1);
    planeMesh.position.copy(planeBody.position);
    world.addBody(planeBody);

    // meshes.push(planeMesh);
    // bodies.push(planeBody);
  }

  async createBox(path, x, y, z) {
    // const cgeo = new THREE.BoxGeometry(1, 0.5, 0.5);
    // const cmat = new THREE.MeshStandardMaterial({ color: 0xdd7d7d });
    // const cmesh = new THREE.Mesh(cgeo, cmat);
    // const gltfLoader = new GLTFLoader();
    const objectLoaded = await gltfLoader.loadAsync(`assets/${path}.glb`);
    let objectMesh = objectLoaded.scene.children[0];
    objectMesh.position.set(x, y, z);
    objectMesh.scale.set(0.5, 0.25, 0.25);
    // objectMesh.material = new THREE.MeshStandardMaterial({ color: 0xdd7d7d });
    scene.add(objectMesh);
    objectMesh.castShadow = true;
    // objecMesh.MeshStandardMaterial({ color: 0xdd7d7d });

    const cbody = new CANNON.Body({
      mass: 5, // kg
      shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.25, 0.25)),
    });
    cbody.position.set(x, y, z); // m
    world.addBody(cbody);

    meshes.push(objectMesh);
    bodies.push(cbody);
  }

  async player() {
    ufobody = new CANNON.Body({
      mass: 2,
      linearDamping: 0.8,
      angularDamping: 0.97,
    });
    // ufobody.addShape(cy);
    ufobody.position.set(0, -4, 12);

    ufobody.addShape(
      new CANNON.Cylinder(0.5, 0.5, 0.25, 8),
      new CANNON.Vec3(),
      new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0)
    );
    // ufobody.addShape(cy);
    world.addBody(ufobody);

    // const gltfLoader = new GLTFLoader();
    const ufoLoaded = await gltfLoader.loadAsync('assets/ufo2glb.glb');
    ufomesh = ufoLoaded.scene.children[0];
    // ufomesh.scale.set(0.003, 0.003, 0.003);
    ufomesh.position.set(0, 0, 0);
    ufomesh.castShadow = true;
    ufomesh.children.map((child) => {
      child.castShadow = true;
    });
    // console.log(ufomesh.position, ufobody.position);

    /*
    const ufotoplight = new THREE.SpotLight(0xffffff, 1, 10);
    ufotoplight.position.set(0, 0, 10);
    ufotoplight.target.position.set(0, 0, 0);
    ufomesh.add(ufotoplight);
    ufomesh.add(ufotoplight.target);
    ufotoplighthelper = new THREE.SpotLightHelper(ufotoplight);
    scene.add(ufotoplighthelper);

    gui.add(ufotoplight.position, 'z', -10, 10, 0.01);
    gui.add(ufotoplight, 'intensity', 0, 2000, 0.01);
    gui.add(ufotoplight, 'distance', 0, 100, 0.01);
    gui.add(ufotoplight, 'angle', 0, Math.PI / 2, 0.01);
    gui.add(ufotoplight, 'penumbra', 0, 1, 0.01);
    gui.add(ufotoplight, 'decay', 0, 2, 0.01);
    */

    scene.add(ufomesh);

    meshes.push(ufomesh);
    bodies.push(ufobody);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const timestep = 1 / 60;

function animate() {
  stats.begin();

  world.step(timestep);
  for (let i = 0; i < meshes.length; i++) {
    meshes[i].position.copy(bodies[i].position);
    meshes[i].quaternion.copy(bodies[i].quaternion);
  }

  moveUfo();
  floatUfo();
  // followCamera();

  placeContactLinksClass.update();
  placeProjectsClass.update();
  placeExperienceClass.update();

  // cannondebugger.update();
  // ufotoplighthelper.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);

  stats.end();
}

function floatUfo() {
  // ___ Raycasting using three js ___
  /*
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(
      ufobody.position.x,
      ufobody.position.y,
      ufobody.position.z
    ),
    new THREE.Vector3(0, 0, -1)
  );

  const intersects = raycaster.intersectObjects(scene.children, false);
  if (intersects.length >= 2) {
    const force = intersects[1].distance;
    const mult = 30;
    ufobody.applyForce(new CANNON.Vec3(0, 0, (1 / force) * mult));
  }
  */

  // ___ Raycasting using cannon js ___

  const result = new CANNON.RaycastResult();
  world.raycastClosest(
    ufobody.position.vadd(new CANNON.Vec3(0, 0, -0.6)),
    ufobody.position.vadd(new CANNON.Vec3(0, 0, -50)),
    {},
    result
  );
  if (result.hasHit) {
    const dis = result.distance;
    const force = (1 / dis) * 17;
    // ufobody.applyForce(new CANNON.Vec3(0, 0, 20));
    ufobody.applyForce(new CANNON.Vec3(0, 0, force >= 27 ? 27 : force));
  } else {
    ufobody.applyForce(new CANNON.Vec3(0, 0, 27));
  }

  let ufoquat = new CANNON.Vec3();
  ufobody.quaternion.toEuler(ufoquat);
  // floating mechanics
  const maxTorqueAngle = (10 / 180) * Math.PI;
  const torqueVal = 5;
  if (ufobody.angularVelocity.almostZero(0.5)) {
    // if (!dir.left && !dir.right && !dir.forward && !dir.back) {
    if (ufobody.quaternion.x > maxTorqueAngle) {
      ufobody.applyTorque(new CANNON.Vec3(-torqueVal, 0, 0));
    }
    if (ufobody.quaternion.x < -maxTorqueAngle) {
      ufobody.applyTorque(new CANNON.Vec3(torqueVal, 0, 0));
    }
    if (ufobody.quaternion.y > maxTorqueAngle) {
      ufobody.applyTorque(new CANNON.Vec3(0, -torqueVal, 0));
    }
    if (ufobody.quaternion.y < -maxTorqueAngle) {
      ufobody.applyTorque(new CANNON.Vec3(0, torqueVal, 0));
    }
  }
}

function keydown(event) {
  const key = event.key.toLowerCase();
  if (key === 'd') {
    dir.right = true;
  }
  if (key === 'a') {
    dir.left = true;
  }
  if (key === 'w' || dir.forward) {
    dir.forward = true;
    speed += acceleration;
  }
  if (key === 's' || dir.back) {
    dir.back = true;
    speed -= acceleration;
  }
  if (key === ' ') {
    // let ufoquat = new CANNON.Vec3();
    // ufobody.quaternion.toEuler(ufoquat);
    ufobody.applyForce(new CANNON.Vec3(0, 0, 500));
  }
}

function keyup(event) {
  const key = event.key.toLowerCase();
  if (key === 'd') dir.right = false;
  if (key === 'a') dir.left = false;
  if (key === 'w') {
    dir.forward = false;
    speed = 0;
  }
  if (key === 's') {
    dir.back = false;
    speed = 0;
  }
}

function applyLocalVelocity(body, localVelocity) {
  // Convert local velocity to a quaternion
  const localVelocityVec3 = new CANNON.Vec3(
    localVelocity.x,
    localVelocity.y,
    localVelocity.z
  );
  const worldVelocityVec3 = new CANNON.Vec3();

  // Rotate local velocity vector to world space using the body's quaternion
  body.quaternion.vmult(localVelocityVec3, worldVelocityVec3);

  // Add the transformed velocity to the body's current velocity
  body.velocity.x += worldVelocityVec3.x;
  body.velocity.y += worldVelocityVec3.y;
  // body.velocity.vadd(worldVelocityVec3, body.velocity);
}

function moveUfo() {
  if (dir.move) {
    let ufoquat = new CANNON.Vec3();
    ufobody.quaternion.toEuler(ufoquat);
    if (dir.forward) {
      if (speed > maxSpeed) speed = maxSpeed;
      applyLocalVelocity(ufobody, new CANNON.Vec3(0, speed, 0));
    }

    if (dir.back) {
      if (speed < -maxSpeed) speed = -maxSpeed;
      applyLocalVelocity(ufobody, new CANNON.Vec3(0, speed, 0));
    }

    if (ufobody.angularVelocity.length() < maxAngularSpeed && dir.left) {
      ufobody.angularVelocity.z += 0.8;
    }

    if (ufobody.angularVelocity.length() < maxAngularSpeed && dir.right) {
      ufobody.angularVelocity.z -= 0.8;
    }
  }
}

function followCamera() {
  orbit.target.set(ufobody.position.x, ufobody.position.y, 0.5);
  camera.position.set(ufobody.position.x, ufobody.position.y - 7, 9);
  // camera.lookAt(ufobody.position);
  orbit.update();
}

let animationLoaded = false;
function loadingAnimation() {
  stats.begin();
  world.step(timestep);

  if (enterKeyPressed) return;

  if (!progress[1]) {
    // if not pause loading animation
    for (let i = 0; i < bodiesWhileLoading.length; i++) {
      const result = new CANNON.RaycastResult();
      world.raycastClosest(
        bodiesWhileLoading[i].position.vadd(new CANNON.Vec3(0, 0, 0.6)),
        bodiesWhileLoading[i].position.vadd(new CANNON.Vec3(0, 0, 50)),
        {},
        result
      );

      const threshold = -0.5 + 10;
      if (result.hasHit) {
        if (bodiesWhileLoading[i].position.z > threshold) {
          bodiesWhileLoading[i].position.z -= 0.05;
        }
        if (
          colorsArr.find((e) => e.equals(meshesWhileLoading[i].material.color))
        ) {
          meshesWhileLoading[i].material.color.lerp(
            colorsArr[Math.floor(Math.random() * 8)],
            Math.random()
          );
        }
      } else {
        if (bodiesWhileLoading[i].position.z < 0 + 10) {
          bodiesWhileLoading[i].position.z += 0.03;
        }
      }

      meshesWhileLoading[i].position.copy(bodiesWhileLoading[i].position);
    }
  } else {
    for (let i = 0; i < bodiesWhileLoading.length; i++) {
      meshesWhileLoading[i].position.copy(bodiesWhileLoading[i].position);
    }
  }

  ufomesh.position.copy(ufobody.position);
  ufomesh.quaternion.copy(ufobody.quaternion);
  moveUfo();
  floatUfo();
  // followCamera();

  if (totalAssets >= progress[0] && !animationLoaded) {
    animationLoaded = true;
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !enterKeyPressed) {
        enterKeyPressed = true;
        loadingSceneClass.removeModels(true);
        ufobody.position.set(-2, 0, 12);

        // temporary
        camera.position.set(0, -14.5, 12.5);
        orbit.target.set(0, -7.8, 3.42);
        orbit.update();

        animate();
        return;
      }
    });
  }

  // cannondebugger.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loadingAnimation);

  stats.end();
}

export default App;
