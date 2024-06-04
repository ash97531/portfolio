import * as THREE from 'three';
class Compass {
  camera;
  cube;
  renderer;
  zoomOptions;
  constructor(camera, renderer, cube) {
    this.camera = camera;
    this.cube = cube;
    this.renderer = renderer;
    this.zoomOptions = {
      maxZoom: 2,
      minZoom: 10,
      step: 0.001,
    };
    this.setAllEvents();
  }

  setAllEvents = () => {
    this.setZoomHandler();
  };

  setZoomHandler = () => {
    // this.renderer.domElement.onwheel = (event) => {
    //   event.preventDefault();
    //   this.zoom(event);
    // };
    this.renderer.domElement.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        this.zoom(event);
      },
      { passive: false }
    );
  };
  getWorldToCanvasPercentCoordinates = (wx, wy) => {
    const canvas = this.renderer.domElement;
    const percentX = (wx / canvas.clientWidth) * 2 - 1;
    const percentY = -(wy / canvas.clientHeight) * 2 + 1;
    return { percentX, percentY };
  };
  getABSBounds = () => {
    return this.getABSBoundsWithCustomZ(this.camera.position.z);
  };
  getWorldToCanvasCoordinates = (wx, wy) => {
    const { z } = this.camera.position;
    return this.getWorldToCanvasWithCustomZ(wx, wy, z);
  };
  getWorldToCanvasWithCustomZ = (wx, wy, cz) => {
    const { percentX, percentY } = this.getWorldToCanvasPercentCoordinates(
      wx,
      wy
    );
    const { x, y } = this.camera.position;
    const { width, height } = this.getABSBoundsWithCustomZ(cz);
    const retX = x + (width / 2) * percentX;
    const retY = y + (height / 2) * percentY;
    return { x: retX, y: retY };
  };
  getABSBoundsWithCustomZ = (z) => {
    const fov = this.camera.fov;
    const aspect = this.camera.aspect;
    const halfHeight = Math.tan((fov * Math.PI) / 180 / 2) * z;
    const halfWidth = halfHeight * aspect;
    return { width: halfWidth * 2, height: halfHeight * 2 };
  };
  zoom = (event) => {
    const { clientX, clientY, deltaY } = event;
    const { step, minZoom, maxZoom } = this.zoomOptions;
    const { z: zp } = this.camera.position;
    let nz = zp;
    nz += deltaY * step;
    if (nz < maxZoom) {
      nz = maxZoom;
    } else if (nz > minZoom) {
      nz = minZoom;
    }

    const { x, y } = this.getWorldToCanvasCoordinates(clientX, clientY);
    const { x: futureX, y: futureY } = this.getWorldToCanvasWithCustomZ(
      clientX,
      clientY,
      nz
    );
    const offX = x - futureX;
    const offY = y - futureY;
    this.camera.position.x -= offX * 5;
    this.camera.position.y += offY * 5;

    // const localDirection = new THREE.Vector3();
    // this.camera.getWorldDirection(localDirection);
    // const right = new THREE.Vector3()
    //   .crossVectors(this.camera.up, localDirection)
    //   .normalize();
    // this.camera.translateOnAxis(right, event.deltaY * 0.01);
    this.camera.position.setZ(nz);
  };
}
export default Compass;
