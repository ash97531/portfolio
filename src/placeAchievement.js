import * as THREE from 'three';
import SceneSection from './SceneSection';
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_HEADING,
  SKILLS_LEFT,
  SKILLS_RIGHT,
} from './content';

class PlaceAchievements extends SceneSection {
  meshes;
  bodies;

  textFont = 'Gudea_Regular';

  constructor(scene, world, meshes, bodies, assets) {
    super(scene, world, assets);
    this.meshes = meshes;
    this.bodies = bodies;

    this.placeModalsPosition();
  }

  createBrickJenga() {
    const dx = 0.01;
    const xoff = -20,
      yoff = -23;
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 2; j++) {
        if (i % 2 == 1) {
          const brick = this.placeGLBMesh('brick', 0, 0, 0, 0.25, 0.5, 0.25);
          const brickBody = this.placeGlbToDynamicBody(
            brick,
            xoff - j * 0.5 - j * dx + 0.25,
            yoff - 0.25,
            i - 0.5 * i - 0.4,
          );
          this.scene.add(brick);
          this.world.addBody(brickBody);
          this.meshes.push(brick);
          this.bodies.push(brickBody);
        } else {
          const brick = this.placeGLBMesh('brick', 0, 0, 0, 0.5, 0.25, 0.25);
          const brickBody = this.placeGlbToDynamicBody(
            brick,
            xoff,
            yoff - j * 0.5 - j * dx,
            i - 0.5 * i - 0.4,
          );
          this.scene.add(brick);
          this.world.addBody(brickBody);
          this.meshes.push(brick);
          this.bodies.push(brickBody);
        }
      }
    }

    const flashLightMesh = this.placeGLBMesh(
      'flashlight optimised',
      0,
      0,
      0,
      0.02,
      0.02,
      0.015,
    );
    const flashLightBody = this.placeGlbToDynamicBody(
      flashLightMesh,
      xoff,
      yoff - 0.2,
      3,
      0,
      Math.PI,
      Math.PI / 3,
    );
    this.world.addBody(flashLightBody);

    const spotLight = new THREE.SpotLight(0xffff, 250);
    spotLight.position.set(0, 1, 0);
    spotLight.target.position.set(0, 13, 0);
    spotLight.angle = 0.6;
    spotLight.castShadow = true;
    flashLightMesh.add(spotLight);
    flashLightMesh.add(spotLight.target);
    this.scene.add(flashLightMesh);

    this.meshes.push(flashLightMesh);
    this.bodies.push(flashLightBody);
  }

  async placeModalsPosition() {
    let xoff = -2,
      yoff = -23;

    const treeMeshDec = await this.placeGLBMesh(
      'tree4ashoka',
      xoff - 23,
      yoff - 11,
      1.8,
      0.3,
      0.3,
      0.3,
    );
    this.scene.add(treeMeshDec);
    treeMeshDec.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMeshDec);

    const fence = await this.placeGLBMesh(
      'fence 4 sticks',
      xoff - 22,
      yoff - 13,
      0,
    );
    fence.rotation.set(0, 0, Math.PI / 2);
    this.scene.add(fence);
    this.placeGlbToCannonBody(fence);

    const fence2 = await this.placeGLBMesh(
      'fence 4 sticks',
      xoff - 25,
      yoff - 9,
      0,
    );
    this.scene.add(fence2);
    this.placeGlbToCannonBody(fence2);

    const stoneMesh = await this.placeGLBMesh(
      'stone24',
      xoff - 13,
      yoff - 9,
      -1.2,
      3,
      3,
      3,
    );
    this.scene.add(stoneMesh);
    this.placeGlbToCannonBody(stoneMesh);

    const stoneMesh2 = await this.placeGLBMesh(
      'stone24',
      xoff - 14,
      yoff - 8,
      -1.1,
      2,
      2,
      2,
    );
    this.scene.add(stoneMesh2);
    this.placeGlbToCannonBody(stoneMesh2);

    const stoneMesh3 = await this.placeGLBMesh(
      'stone24',
      xoff - 13,
      yoff - 7.5,
      -1.1,
      1.5,
      1.5,
      1.5,
    );
    this.scene.add(stoneMesh3);
    this.placeGlbToCannonBody(stoneMesh3);

    const combinedstone = await this.placeGLBMesh(
      'stone combined 1',
      xoff - 8,
      yoff - 14.5,
      -0.25,
      0.004,
      0.004,
      0.004,
      0,
      0,
      1,
    );
    combinedstone.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(combinedstone);
    this.placeGlbToCannonBody(combinedstone);

    const bush = await this.placeGLBMesh(
      'bush',
      xoff + 2,
      yoff - 12,
      -0.5,
      1.2,
      1.2,
      1.2,
    );
    this.scene.add(bush);

    const bush2 = await this.placeGLBMesh(
      'bush',
      xoff + 3,
      yoff - 12.5,
      -0.5,
      1.4,
      1.4,
      1.2,
    );
    this.scene.add(bush2);

    const bush3 = await this.placeGLBMesh(
      'bush',
      xoff + 2.5,
      yoff - 13.5,
      -0.5,
    );
    this.scene.add(bush3);
    bush3.rotation.set(Math.PI / 4, 0, 0);

    const bushDark = await this.placeGLBMesh(
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

    const darkBush2 = await this.placeGLBMesh(
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

    const darkBush3 = await this.placeGLBMesh(
      'dark bush',
      xoff + 1,
      yoff - 12.7,
      -0.5,
      1.6,
      1.6,
      1.6,
    );
    this.scene.add(darkBush3);

    const trophy = await this.placeGLBMesh(
      'trophy',
      xoff + 4,
      yoff,
      0.5,
      0.65,
      0.65,
      0.65,
    );
    trophy.children.map((child) => {
      child.castShadow = true;
    });
    this.scene.add(trophy);
    this.placeGlbToCannonBody(trophy);

    const treeMesh = await this.placeGLBMesh(
      'tree4ashoka',
      xoff - 4,
      yoff,
      0.9,
      0.2,
      0.2,
      0.2,
    );
    const archery = await this.placeGLBMesh(
      'archery skills',
      0,
      -3.1,
      2,
      2.5,
      2.5,
      2.5,
      -Math.PI / 7,
    );
    treeMesh.add(archery);
    this.scene.add(treeMesh);
    treeMesh.children.map((child) => {
      child.castShadow = true;
    });
    this.placeGlbToCannonBody(treeMesh);

    const headingText = this.getTextMesh(ACHIEVEMENTS_HEADING, 0.7, 0.3);
    headingText.position.set(xoff - 2.5, yoff, -1);
    this.scene.add(headingText);

    ACHIEVEMENTS.forEach((achievement, i) => {
      const text = this.getTextMesh(achievement, 0.4, 0.3);
      text.position.set(xoff - 4, yoff - 3 - i * 1.5, -1);
      this.scene.add(text);
    });

    const leftSideSkills = this.getTextMesh(SKILLS_LEFT, 0.4, 0.3);
    leftSideSkills.position.set(xoff - 5.5, yoff - 10.5, -1);
    leftSideSkills.rotation.set(0, 0, Math.PI / 2);
    this.scene.add(leftSideSkills);

    const rightSideSkills = this.getTextMesh(SKILLS_RIGHT, 0.4, 0.3);
    rightSideSkills.position.set(xoff + 6.5, yoff - 2, -1);
    rightSideSkills.rotation.set(0, 0, -Math.PI / 2);
    this.scene.add(rightSideSkills);

    this.createBrickJenga();
  }
}

export default PlaceAchievements;
