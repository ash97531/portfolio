import * as THREE from 'three';

// A warm-highlight -> cool-shadow gradient, sampled by MeshToonMaterial's
// gradientMap (u = N.L) instead of MeshStandardMaterial's realistic PBR
// falloff - see the bruno-simon.com reference analysis in project memory
// for why this reads as softer/more "soothing" than plain lit materials.
// LinearFilter (rather than the usual toon-shading NEAREST) keeps the
// transition smooth instead of banding into hard cel-shaded steps.
const GRADIENT_SIZE = 32;
let sharedGradientTexture;

function getGradientTexture() {
  if (sharedGradientTexture) return sharedGradientTexture;

  const canvas = document.createElement('canvas');
  canvas.width = GRADIENT_SIZE;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, GRADIENT_SIZE, 0);
  gradient.addColorStop(0, '#333058'); // cool shadow (blue-purple)
  gradient.addColorStop(0.55, '#9c7a52'); // warm mid-tone
  gradient.addColorStop(1, '#d9b183'); // warm highlight - kept off pure
  // white so lit surfaces don't blow out under the scene's directional
  // lights (multiplied against the base color, not a hard cap)
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GRADIENT_SIZE, 1);

  sharedGradientTexture = new THREE.CanvasTexture(canvas);
  sharedGradientTexture.minFilter = THREE.LinearFilter;
  sharedGradientTexture.magFilter = THREE.LinearFilter;
  sharedGradientTexture.generateMipmaps = false;

  return sharedGradientTexture;
}

// Drop-in-ish replacement for `new THREE.MeshStandardMaterial(options)` -
// same `color`/`transparent`/`opacity` inputs, still lit by the scene's
// existing lights, but shaded through the warm/cool ramp above instead of
// PBR metalness/roughness.
function createGradientMaterial(options = {}) {
  return new THREE.MeshToonMaterial({
    ...options,
    gradientMap: getGradientTexture(),
  });
}

export default createGradientMaterial;
