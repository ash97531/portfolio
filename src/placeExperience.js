import * as THREE from 'three';
import SceneSection from './SceneSection';
import { distance2D } from './utils';
import { EXPERIENCES } from './content';
import hud from './Hud';

// Distances (in world units) from an experience button's center.
const BUTTON_NEAR_RADIUS = 8;
const BUTTON_ON_RADIUS = 6;

class PlaceExperience extends SceneSection {
  ufobody;

  expButtons = []; // [{ button, link }]

  onExpBtn = -1;

  // original meshes never set receiveShadow
  receiveShadowByDefault = false;

  constructor(scene, world, assets, ufobody) {
    super(scene, world, assets);
    this.ufobody = ufobody;

    this.placeModalsPosition();
  }

  onEnter() {
    if (this.onExpBtn !== -1 && this.onExpBtn !== '') {
      window.open(this.onExpBtn, '_blank');
    }
  }

  placeModalsPosition() {
    let xoff = -38.4,
      yoff = -22;

    for (const exp of EXPERIENCES) {
      const button = this.placeGLBMesh(
        'experience button',
        xoff + exp.buttonPos.dx,
        yoff + exp.buttonPos.dy,
        -0.6,
        0.9,
        0.9,
      );
      this.scene.add(button);
      this.expButtonText(
        button,
        exp.company,
        exp.position,
        exp.period,
        exp.bullets,
        0,
        -1,
        exp.nameOffset,
      );
      this.expButtons.push({ button, link: exp.link });
    }

    ((xoff -= 15), (yoff = -12));
    const bush = this.placeGLBMesh(
      'bush',
      xoff + 2,
      yoff - 12,
      -0.5,
      1.2,
      1.2,
      1.2,
    );
    this.scene.add(bush);

    const bush2 = this.placeGLBMesh(
      'bush',
      xoff + 3,
      yoff - 12.5,
      -0.5,
      1.4,
      1.4,
      1.2,
    );
    this.scene.add(bush2);

    const bushDark = this.placeGLBMesh(
      'dark bush',
      xoff + 1.1,
      yoff - 11.5,
      -0.5,
      1.2,
      1.2,
      1.2,
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
      1.2,
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
      1.6,
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
    h = 0,
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
    for (const { button, link } of this.expButtons) {
      this.enterButtonRange(button, link);
    }
  }

  enterButtonRange(btn, onBtnLink) {
    const distToButton = distance2D(btn.position, this.ufobody.position);
    if (distToButton < BUTTON_NEAR_RADIUS) {
      hud.setMessage('Press ENTER: Fly to experience');
      if (distToButton < BUTTON_ON_RADIUS) {
        if (btn.position.z > -1) {
          btn.position.z -= 0.01;
          hud.show();
          this.onExpBtn = onBtnLink;
        }
      } else {
        if (btn.position.z < -0.6) {
          btn.position.z += 0.01;
          hud.hide();
          this.onExpBtn = -1;
        }
      }
    }
  }
}

export default PlaceExperience;
