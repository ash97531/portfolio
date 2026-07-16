import * as THREE from 'three';
import SceneSection from './SceneSection';
import { distance2D } from './utils';

class PlaceExperience extends SceneSection {
  ufobody;

  expButton1;
  expButton2;
  expButton3;

  onExpBtn = -1;

  // original meshes never set receiveShadow
  receiveShadowByDefault = false;

  constructor(scene, world, assets, ufobody) {
    super(scene, world, assets);
    this.ufobody = ufobody;

    this.placeModalsPosition();

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (this.onExpBtn != -1) {
          window.open(this.onExpBtn, '_blank');
        }
      }
    });
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

    this.expButton3 = this.placeGLBMesh(
      'experience button',
      xoff - 44,
      yoff + 2,
      -0.6,
      0.9,
      0.9
    );
    this.scene.add(this.expButton3);
    this.expButtonText(
      this.expButton3,
      '  Brane Enterprises',
      '  (ASSOCIATE SOLUTION LEADER)',
      '- Jul 2024 - Present',
      [
        '-> Collaborate with 5+ development team to \n    design, build, and efficient backend REST APIs\n    for various applications',
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

    const position = this.getTextMesh(posText, 0.45, 0.3);
    expButton.add(position);
    position.position.set(xoff - 4.5, yoff + 3, 0.2);

    const months = this.getTextMesh(monthsText, 0.4, 0.3);
    expButton.add(months);
    months.position.set(xoff + 0.5, yoff + 2, 0.2);

    for (let i = 0; i < descArr.length; i++) {
      const desc = this.getTextMesh(descArr[i], 0.3, 0.2);
      expButton.add(desc);
      desc.position.set(xoff - 4, yoff + 1 - i * 1.2, 0.3);
    }
  }

  update() {
    this.enterButtonRange(
      this.expButton1,
      'https://drive.google.com/file/d/18O7Kphq2ZUyFED-QR5JQC1OXDwFsWUq4/view?usp=drive_link'
    );
    this.enterButtonRange(
      this.expButton2,
      'https://drive.google.com/file/d/1ec37RNmuRhBjHd27UoCFILDGsW1pMBnB/view?usp=drive_link'
    );
    this.enterButtonRange(this.expButton3, '');
  }

  enterButtonRange(btn, onBtnLink) {
    const distToButton = distance2D(btn.position, this.ufobody.position);
    if (distToButton < 8 /* on button check */) {
      if (distToButton < 6 /* on mountain check */) {
        document.getElementById('modal-text').textContent =
          'Press ENTER: Fly to experience';
        if (btn.position.z > -1) {
          btn.position.z -= 0.01;
          document.getElementById('modal-container').classList.add('six');
          document.getElementById('modal-container').classList.remove('out');
          this.onExpBtn = onBtnLink;
        }
      } else {
        document.getElementById('modal-text').textContent =
          'Press ENTER: Fly to experience';
        if (btn.position.z < -0.6) {
          btn.position.z += 0.01;
          document.getElementById('modal-container').classList.add('out');
          this.onExpBtn = -1;
        }
      }
    }
  }
}

export default PlaceExperience;
