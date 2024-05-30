import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GUI } from 'dat.gui';

import PlaceTrees from './placeTrees';
import PlaceContactLinks from './placeContactLinks';

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

let camera, scene, renderer, world, orbit;
let meshes = [],
  bodies = [];
let ufobody, ufomesh;
let cannondebugger;
let dir = { right: false, left: false, forward: false, back: false };
const gltfLoader = new GLTFLoader();
let speed = 0,
  maxSpeed = 0.5,
  maxAngularSpeed = 2,
  acceleration = 0.05;
const gui = new GUI();
class App {
  async init() {
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', keydown, false);
    window.addEventListener('keyup', keyup, false);
    this.setUpGraphics();
    // addBackground();
    this.setupPhysicsWorld();
    // scene.add(await this.placeGLBMesh('gmail2', 0, 0, 0, 1, 0.4, 0.8));
    this.placeName();
    this.placeBackWall();
    this.placeNameLights();

    this.placeStaticObjects();

    // this.createBox('brick', 3, 0, 1);
    // this.createBox('brick', 4, 0, 1);
    // this.createBox('brick', 4, 0, 2);
    // this.createBox('brick', 5, 0, 1);
    // this.createBox('brick', 5, 0, 2);
    // this.createBox('brick', 5, 0, 3);
    this.createGround();
    this.player();

    animate();
  }

  placeStaticObjects() {
    // new PlaceTrees(scene, world);
    new PlaceContactLinks(scene, world);
  }

  placeNameLights() {
    const spotLight = new THREE.SpotLight(0xffff, 100);
    spotLight.position.set(-5.6, 0, 0.5);
    spotLight.target.position.set(-5.6, 13, 0.5);
    spotLight.angle = 0.6;
    spotLight.castShadow = true;
    scene.add(spotLight);
    scene.add(spotLight.target);

    const spotLight2 = new THREE.SpotLight(0xffff, 100);
    spotLight2.position.set(0.8, 0, 0.5);
    spotLight2.target.position.set(0.8, 13, 0.5);
    spotLight2.angle = 0.6;

    spotLight2.castShadow = true;
    scene.add(spotLight2);
    scene.add(spotLight2.target);
  }

  async placeName() {
    let meshArr = [],
      bodyArr = [];
    const xoffset = -12,
      yoffset = 10;
    meshArr.push(await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('s', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('h', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('w', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('n', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('i', 0, 0, 0, 0.05, 0.05, 0.05));
    // write mesh for word 'kumar'
    meshArr.push(await this.placeGLBMesh('k', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('u', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('m', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('a', 0, 0, 0, 0.05, 0.05, 0.05));
    meshArr.push(await this.placeGLBMesh('r', 0, 0, 0, 0.05, 0.05, 0.05));

    bodyArr.push(this.placeGlbToCannonBody(meshArr[0], xoffset, yoffset, 0));
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[1], xoffset + 1.55, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[2], xoffset + 3.05, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[3], xoffset + 5, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[4], xoffset + 7, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[5], xoffset + 8.7, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[6], xoffset + 10, yoffset, 0)
    );

    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[7], xoffset + 12, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[8], xoffset + 13.7, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[9], xoffset + 15.6, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[10], xoffset + 17.6, yoffset, 0)
    );
    bodyArr.push(
      this.placeGlbToCannonBody(meshArr[11], xoffset + 19.4, yoffset, 0)
    );

    for (let i = 0; i < meshArr.length; i++) {
      scene.add(meshArr[i]);
      world.addBody(bodyArr[i]);
      meshes.push(meshArr[i]);
      bodies.push(bodyArr[i]);
    }
    // body = this.placeGlbToCannonBody(mesh, 0, 0, 0);
    // scene.add(meshArr[0]);
    // world.addBody(bodyArr[0]);

    // meshes.push(mesh);
    // bodies.push(body);
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

  async placeBackWall() {
    const brickMesh = await this.placeGLBMesh(
      'brick',
      0,
      0,
      0,
      0.5,
      0.25,
      0.25,
      0,
      0,
      0,
      true
    );
    for (let j = 0; j < 5; j++) {
      for (let i = 0; i < 23; i++) {
        const brick = brickMesh.clone();
        const brickBody = this.placeGlbToCannonBody(
          brick,
          i - 14 + (j % 2 != 0 ? 0.5 : 0),
          13,
          j - 0.5 - j * 0.5
        );
        scene.add(brick);
        world.addBody(brickBody);
        meshes.push(brick);
        bodies.push(brickBody);
        // this.createBox('brick', i, j, 0);
      }
    }
  }

  placeGlbToCannonBody(mesh, x = 0, y = 0, z = 0) {
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
    return cannonBody;
  }

  setUpGraphics() {
    camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      5000
    );
    camera.position.set(15.3, -3.5, 5.7);
    camera.lookAt(new THREE.Vector3(15.3, -7.5, 7.7));
    camera.rotation.set(0.61, 0.65, 0.82);
    // camera.rotation.set(0, 0, 90);
    // console.log(camera);
    // camera.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    // camera.rotateZ(90);
    // const cubeRotation = gui.addFolder('Cube');
    // cubeRotation.add(camera.rotation, 'x', 0, Math.PI);
    // cubeRotation.add(camera.rotation, 'y', 0, Math.PI);
    // cubeRotation.add(camera.rotation, 'z', 0, Math.PI);
    // cubeRotation.open();
    // const cubePosition = gui.addFolder('Pos');
    // cubePosition.add(camera.position, 'x', -15, 25);
    // cubePosition.add(camera.position, 'y', -15, 15);
    // cubePosition.add(camera.position, 'z', -15, 15);
    // cubePosition.open();

    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    const helper = new THREE.AxesHelper(20);

    scene.add(helper);

    // cannonhelper = new CANNON.CannonHelper(scene);
    // cannonhelper.addLights(renderer);

    // orbit = new OrbitControls(camera, renderer.domElement);
    // orbit.mouseButtons = {
    //   LEFT: THREE.MOUSE.PAN,
    //   MIDDLE: THREE.MOUSE.DOLLY,
    //   RIGHT: THREE.MOUSE.ROTATE,
    // };
    // orbit.enableRotate = false;
    // orbit.update();

    const ambientLight = new THREE.HemisphereLight(0xffffbb, 0x080820);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-45, 50, 60);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    // directionalLight.shadow.bias = -0.001;
    // directionalLight.shadow.radius = 4;
    // directionalLight.shadow.camera.near = 0.5;
    // directionalLight.shadow.camera.far = 500.0;
    directionalLight.shadow.camera.left = 100;
    directionalLight.shadow.camera.right = -100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight2.position.set(0, -20, 10);
    directionalLight2.target.position.set(0, 0, 0);
    scene.add(directionalLight2);

    // this.placeObject('ufo5', 4, 0, 4);
  }

  setupPhysicsWorld() {
    world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.81) });
    world.broadphase = new CANNON.SAPBroadphase(world); // Use SAP broadphase
    world.solver.iterations = 10; // Set solver iterations for stability

    world.allowSleep = true;
    // cannondebugger = new CannonDebugger(scene, world);
  }

  createGround() {
    const planeGeo = new THREE.BoxGeometry(100, 100, 0.5);
    const planeMat = new THREE.MeshStandardMaterial({
      color: 'rgb(255, 216, 186)',
      side: THREE.DoubleSide,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.receiveShadow = true;
    scene.add(planeMesh);

    const planePhysMat = new CANNON.Material();
    const planeBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Box(new CANNON.Vec3(50, 50, 0.25)),
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

  createJenga() {
    const size = 0.5;
    const mass = 1;
    const gap = 0.02;

    // Layers
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 3; j++) {
        const body = new CANNON.Body({ mass });

        let halfExtents;
        let dx;
        let dz;
        if (i % 2 === 0) {
          halfExtents = new CANNON.Vec3(size, size * 3, size);
          dx = 1;
          dz = 0;
        } else {
          halfExtents = new CANNON.Vec3(size * 3, size, size);
          dx = 0;
          dz = 1;
        }

        const shape = new CANNON.Box(halfExtents);
        body.addShape(shape);
        body.position.set(
          2 * (size + gap) * (j - 1) * dx,
          2 * (size + gap) * (j - 1) * dz,
          2 * (size + gap) * (i + 1)
        );

        world.addBody(body);
      }
    }
  }

  async player() {
    ufobody = new CANNON.Body({
      mass: 2,
      linearDamping: 0.8,
      angularDamping: 0.7,
    });
    // ufobody.addShape(cy);
    ufobody.position.set(0, -4, 2);

    ufobody.addShape(
      new CANNON.Box(new CANNON.Vec3(0.05, 0.05, 0.05)),
      new CANNON.Vec3(0, 0.6, 0)
    );
    ufobody.addShape(
      new CANNON.Cylinder(0.5, 0.5, 0.25, 8),
      new CANNON.Vec3(),
      new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0)
    );
    // ufobody.addShape(cy);
    world.addBody(ufobody);
    /*
    gltfLoader.load('assets/ufo5.glb', (gltf) => {
      // gltf.scene.castShadow = true;
      gltf.scene.traverse((child) => {
        child.position.set(0, 0, 0);
        child.scale.set(0.003, 0.003, 0.003);
        child.quaternion.setFromAxisAngle(
          new CANNON.Vec3(1, 0, 0),
          (Math.PI / 180) * 0
        );
        child.castShadow = true;
      });
      scene.add(gltf.scene);
      meshes.push(gltf.scene);
      bodies.push(ufobody);
    });
    */
    // const gltfLoader = new GLTFLoader();
    const ufoLoaded = await gltfLoader.loadAsync('assets/ufo2light.glb');
    ufomesh = ufoLoaded.scene.children[0];
    ufomesh.scale.set(0.003, 0.003, 0.003);
    ufomesh.position.set(0, 0, 0);
    ufomesh.castShadow = true;
    // console.log(ufomesh.position, ufobody.position);

    scene.add(ufomesh);

    meshes.push(ufomesh);
    bodies.push(ufobody);
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

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
  followCamera();
  // camera.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), (Math.PI * 0.5) / 180);

  // cannondebugger.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);

  stats.end();
}

function floatUfo() {
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
    const mult = 20;
    ufobody.applyForce(new CANNON.Vec3(0, 0, (1 / force) * mult));
  }

  let ufoquat = new CANNON.Vec3();
  ufobody.quaternion.toEuler(ufoquat);
  // floating mechanics
  const maxTorqueAngle = (10 / 180) * Math.PI;
  const torqueVal = 4;
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
  if (key === 'w') {
    dir.forward = true;
    speed += acceleration;
  }
  if (key === 's') {
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
    ufobody.angularVelocity.z += 0.5;
  }

  if (ufobody.angularVelocity.length() < maxAngularSpeed && dir.right) {
    ufobody.angularVelocity.z -= 0.5;
  }
}

function followCamera() {
  // orbit.target.set(ufobody.position.x, ufobody.position.y, 0.5);
  camera.position.set(ufobody.position.x + 5, ufobody.position.y - 5, 6);
  // camera.lookAt(ufobody.position);
  // orbit.update();
}

export default App;
