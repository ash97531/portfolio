import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import { GUI } from 'dat.gui';
import { TextGeometry } from 'three/examples/jsm/Addons.js';

class PlaceExperience {
  scene;
  world;
  assets;
  gltfLoader;
  ufobody;

  expButton1;
  expButton2;

  constructor(scene, world, assets, ufobody) {
    this.scene = scene;
    this.world = world;
    this.assets = assets;
    this.gltfLoader = new GLTFLoader();
    this.ufobody = ufobody;

    this.placeModalsPosition();
  }

  placeModalsPosition() {
    let xoff = -38.4,
      yoff = -22;
    this.expButton1 = this.placeGLBMesh(
      'experience button',
      xoff,
      yoff,
      -0.6,
      0.9,
      0.9
    );
    this.scene.add(this.expButton1);
    this.expButtonText(
      this.expButton1,
      'MARLIN AI',
      '(SOFTWARE ENGINEERING INTERN)',
      '- Jun - Jul 2021',
      [
        '-> Built a cross platfom Flutter App with\n    React integration for course booking System',
        '-> Developed real-time web console and Rest\n     APIs for streamlined Booking and Payment',
      ],
      0,
      -1
    );

    this.expButton2 = this.placeGLBMesh(
      'experience button',
      xoff - 27.1,
      yoff - 1,
      -0.6,
      0.9,
      0.9
    );
    this.scene.add(this.expButton2);
    this.expButtonText(
      this.expButton2,
      'GAMEON TECHNOLOGIES',
      '(SOFTWARE ENGINEERING INTERN)',
      '- Aug - Nov 2021',
      [
        '-> Built a real-time tournament registration\n    system with integrated payment gateway',
        '-> Enhanced application functionality by adding\n     over 10 features and resolving critical bugs.',
      ],
      0,
      -1,
      -2
    );

    (xoff -= 15), (yoff = -12);
    const bush = this.placeGLBMesh(
      'bush',
      xoff + 2,
      yoff - 12,
      -0.5,
      1.2,
      1.2,
      1.2
    );
    this.scene.add(bush);

    const bush2 = this.placeGLBMesh(
      'bush',
      xoff + 3,
      yoff - 12.5,
      -0.5,
      1.4,
      1.4,
      1.2
    );
    this.scene.add(bush2);

    const bushDark = this.placeGLBMesh(
      'dark bush',
      xoff + 1.1,
      yoff - 11.5,
      -0.5,
      1.2,
      1.2,
      1.2
    );
    bushDark.rotation.set(Math.PI / 4, Math.PI / 2, 0);
    this.scene.add(bushDark);

    const darkBush2 = this.placeGLBMesh(
      'dark bush',
      xoff + 3.1,
      yoff - 11.5,
      -0.5,
      1.4,
      1.4,
      1.2
    );
    darkBush2.rotation.set(Math.PI / 4, 0, 0);
    this.scene.add(darkBush2);

    const darkBush3 = this.placeGLBMesh(
      'dark bush',
      xoff + 1,
      yoff - 12.7,
      -0.5,
      1.6,
      1.6,
      1.6
    );
    this.scene.add(darkBush3);
  }

  expButtonText(
    expButton,
    nameText,
    posText,
    monthsText,
    descArr,
    xoff,
    yoff,
    h = 0
  ) {
    const buttonLight = new THREE.SpotLight(0xffd700, 40);
    buttonLight.position.set(0, 0, 3.4);
    buttonLight.name = 'btnLight'; // 1.5-3.5
    buttonLight.target.position.set(0, 0, 0);
    expButton.add(buttonLight);
    expButton.add(buttonLight.target);

    const companyName = this.getTextMesh(nameText, 0.5, 0.3);
    expButton.add(companyName);
    companyName.position.set(xoff - 1 + h, yoff + 4, 0.2);
    // this.guicheck(companyName);

    const position = this.getTextMesh(posText, 0.45, 0.3);
    expButton.add(position);
    position.position.set(xoff - 4.5, yoff + 3, 0.2);

    const months = this.getTextMesh(monthsText, 0.4, 0.3);
    expButton.add(months);
    months.position.set(xoff + 0.5, yoff + 2, 0.2);

    // const descArr = [
    //   '-> Built a cross platfom Flutter App with\n    React integration for course booking System',
    //   '-> Developed real-time web console and Rest\n     APIs for streamlined Booking and Payment',
    // ];

    for (let i = 0; i < descArr.length; i++) {
      const desc = this.getTextMesh(descArr[i], 0.3, 0.2);
      expButton.add(desc);
      desc.position.set(xoff - 4, yoff + 1 - i * 1.2, 0.3);
      // this.guicheck(desc);
    }
  }

  getTextMesh(text, size, depth) {
    const geometry = new TextGeometry(text, {
      font: this.assets['Chela One_Regular'],
      size: size,
      depth: depth,
      curveSegments: 10,
      bevelEnabled: false,
    });
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.castShadow = true;
    return textMesh;
  }

  placeGLBMesh(
    path,
    x = 0,
    y = 0,
    z = 0,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0
  ) {
    // const objectLoaded = await this.gltfLoader.loadAsync(`assets/${path}.glb`);
    // let objectMesh = objectLoaded.scene.children[0];
    const objectMesh = this.assets[path].clone();
    objectMesh.position.set(x, y, z);
    objectMesh.scale.set(sx, sy, sz);
    objectMesh.castShadow = true;
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
      type: CANNON.Body.STATIC,
    });
    cannonBody.addShape(boxShape);
    cannonBody.position.copy(mesh.position);
    this.world.addBody(cannonBody);
  }

  guicheck(mesh) {
    const gui = new GUI();
    const folder = gui.addFolder('position');
    folder.add(
      mesh.position,
      'x',
      mesh.position.x - 10,
      mesh.position.x + 10,
      0.1
    );
    folder.add(
      mesh.position,
      'y',
      mesh.position.y - 10,
      mesh.position.y + 10,
      0.1
    );
    folder.add(
      mesh.position,
      'z',
      mesh.position.z - 10,
      mesh.position.z + 10,
      0.1
    );
    folder.open();
    const folder2 = gui.addFolder('rotation');
    folder2.add(mesh.rotation, 'x', -Math.PI, Math.PI, 0.001);
    folder2.add(mesh.rotation, 'y', -Math.PI, Math.PI, 0.001);
    folder2.add(mesh.rotation, 'z', -Math.PI, Math.PI, 0.001);
    folder2.open();
    const folder3 = gui.addFolder('scale');
    folder3.add(mesh.scale, 'x', 0, 5, 0.001);
    folder3.add(mesh.scale, 'y', 0, 5, 0.001);
    folder3.add(mesh.scale, 'z', 0, 5, 0.001);
    folder3.open();
  }

  update() {
    this.enterButtonRange(this.expButton1);
    this.enterButtonRange(this.expButton2);
  }

  enterButtonRange(btn) {
    if (
      Math.sqrt(
        Math.pow(btn.position.x - this.ufobody.position.x, 2) +
          Math.pow(btn.position.y - this.ufobody.position.y, 2)
      ) < 8 // on button check
    ) {
      if (
        Math.sqrt(
          Math.pow(btn.position.x - this.ufobody.position.x, 2) +
            Math.pow(btn.position.y - this.ufobody.position.y, 2)
        ) < 6 // on mountain check
      ) {
        if (btn.position.z > -1) {
          btn.position.z -= 0.01;
          document.getElementById('modal-container').classList.add('six');
          document.getElementById('modal-container').classList.remove('out');
        }
      } else {
        if (btn.position.z < -0.6) {
          btn.position.z += 0.01;
          document.getElementById('modal-container').classList.add('out');
        }
      }
    }
  }
}

export default PlaceExperience;
