import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';

// Camera, orbit controls, mouse pan / wheel zoom, and the spotlight that
// follows the camera to light up the area around the UFO.
class CameraRig {
  app;
  camera;
  orbit;
  ufotoplight = new THREE.SpotLight(0xfdfa72, 550);

  camZoomY = 0;
  camZoomZ = 0;
  repositioned = true;
  isPanning = false;
  startPan = new THREE.Vector2();

  constructor(app) {
    this.app = app;

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      2000
    );
    this.camera.position.set(12.5, -14.5, 12.5 + 10);
    this.camera.rotation.set(0.74, 2.71, -2.511);

    this.orbit = new OrbitControls(this.camera, app.renderer.domElement);
    this.orbit.target.set(12.5, -7.8, 3.42 + 10);
    this.orbit.enableRotate = false;
    this.orbit.enableZoom = false;
    this.orbit.enablePan = false;
    this.orbit.update();

    this.ufotoplight.penumbra = 1;
    this.moveSpotlightToCamera();
    app.scene.add(this.ufotoplight);
    app.scene.add(this.ufotoplight.target);

    window.addEventListener('wheel', (e) => this.cameraZoom(e), false);
    window.addEventListener('mousedown', (e) => this.onMouseDown(e), false);
    window.addEventListener('mousemove', (e) => this.onMouseMove(e), false);
    window.addEventListener('mouseup', (e) => this.onMouseUp(e), false);
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

  // Called every frame of the main loop: chase the UFO while it moves.
  update(player) {
    if (!player.isMovingHorizontally()) return;

    if (!this.repositioned) {
      new TWEEN.Tween(this.camera.position)
        .to(
          {
            x: player.ufobody.position.x,
            y: player.ufobody.position.y - 9 + this.camZoomY,
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
      this.followCamera(player);
    }
  }

  followCamera(player) {
    this.orbit.target.set(
      player.ufobody.position.x,
      player.ufobody.position.y,
      0.5
    );
    this.camera.position.set(
      player.ufobody.position.x,
      player.ufobody.position.y - 9 + this.camZoomY,
      12 + this.camZoomZ
    );
    this.orbit.update();
    this.moveSpotlightToCamera();
  }

  // Jump the camera straight to the UFO (used when entering the main scene).
  snapToUfo(player) {
    this.orbit.target.set(
      player.ufobody.position.x,
      player.ufobody.position.y,
      0.5
    );
    this.camera.position.set(
      player.ufobody.position.x,
      player.ufobody.position.y - 9,
      12
    );
    this.orbit.update();
    this.moveSpotlightToCamera();
  }

  onMouseDown(event) {
    if (event.button === 0) {
      this.isPanning = true;
      this.startPan.set(event.clientX, event.clientY);
    }
  }

  onMouseMove(event) {
    if (!this.isPanning) return;
    if (!this.app.enterKeyPressed) return;
    if (this.app.player.isMovingHorizontally()) return;
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
    if (!this.app.enterKeyPressed) return;
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
      this.app.player.ufobody.position.x,
      this.app.player.ufobody.position.y - 9 + this.camZoomY,
      12 + this.camZoomZ
    );
    this.orbit.update();

    this.moveSpotlightToCamera();
  }
}

export default CameraRig;
