import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * Riverbank swash foam -- animation gallery.
 *
 * Same shoreline scene and the same "foam ribbon" shape language that
 * worked in experiments/riverbank/ (elongated along the shore, tapering to
 * a point at both ends, smooth centre / ragged tips) -- but five different
 * ANIMATION personalities for how the ribbons come and go:
 *
 *   1. Swash Pulse       - each ribbon on its own timer: rush in, drain,
 *                          rest (the original riverbank behaviour)
 *   2. Traveling Surge    - a band of activation sweeps along the shore,
 *                          like a wave rolling down the bank
 *   3. Slow Tide Breathing- most ribbons swell and recede together on one
 *                          long, lazy cycle -- big synchronized sets
 *   4. Rapid Flicker      - short-lived, small, near-constantly flickering
 *                          -- turbulent, choppy water
 *   5. Drifting Foam      - ribbons pulse in place while also swaying
 *                          sideways along the shore, like being carried
 *                          by a current
 *
 * The land/water floor, colours, diamond bank texture and camera are
 * identical across variants -- only the foam timing/shape functions swap.
 */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x13182f);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(1, 15, 13);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 6;
controls.maxDistance = 40;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 0, 0);

// ---------------------------------------------------------------------------
// Shared floor: flat plane split by a wavy shoreline, land +X / water -X.
// ---------------------------------------------------------------------------
const PLANE_W = 30;
const PLANE_D = 20;

const uTime = { value: 0 };
const uLandNear = { value: new THREE.Color(0xe3a468) };
const uLandFar = { value: new THREE.Color(0xb35a2e) };
const uWaterNear = { value: new THREE.Color(0x5f8fa0) };
const uWaterFar = { value: new THREE.Color(0x141c3a) };
const uFoam = { value: new THREE.Color(0xfbe9ef) };

const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_D, 2, 2).rotateX(-Math.PI / 2);

const VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorld;
  void main(){
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

// Functions shared by every variant: hashing/noise, the shoreline curve.
const GLSL_HEADER = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uLandNear, uLandFar, uWaterNear, uWaterFar, uFoam;
  varying vec3 vWorld;

  float hash1(float n){ return fract(sin(n) * 43758.5453123); }
  float hash21(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float vnoise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p){
    float s = 0.0, a = 0.5;
    for(int i = 0; i < 4; i++){
      s += a * (vnoise(p) * 2.0 - 1.0);
      p = p * 2.02 + 3.1;
      a *= 0.55;
    }
    return s;
  }

  float shoreX(float z){
    return sin(z * 0.14 + 1.3) * 1.6 + fbm(vec2(z * 0.08, z * 0.031 + 4.0)) * 1.4;
  }
`;

// Base gradient + diamond bank texture + foam composite + vignette/dither.
// Every variant ends with this, calling its own foamField(u, v).
const GLSL_MAIN = /* glsl */ `
  void main(){
    float shore = vWorld.x - shoreX(vWorld.z);
    float u = -shore;

    float blend = smoothstep(-7.0, 7.0, shore);
    float landT = smoothstep(0.0, 13.0, shore);
    float waterT = smoothstep(0.0, 13.0, u);
    vec3 land = mix(uLandNear, uLandFar, landT);
    vec3 water = mix(uWaterNear, uWaterFar, waterT);
    vec3 col = mix(water, land, blend);

    vec2 g = vec2(vWorld.x + vWorld.z, vWorld.x - vWorld.z) * 0.55;
    float gridLine = min(abs(fract(g.x) - 0.5), abs(fract(g.y) - 0.5));
    float diamond = 1.0 - smoothstep(0.0, 0.025, gridLine);
    float landMask = smoothstep(1.0, 6.0, shore);
    col = mix(col, col * 0.9, diamond * landMask * 0.6);

    float foam = foamField(u, vWorld.z);
    col = mix(col, uFoam, foam);

    float d = length(vWorld - cameraPosition);
    col = mix(col, col * 0.6, smoothstep(10.0, 30.0, d) * 0.5);

    col += (hash21(gl_FragCoord.xy) - 0.5) * (1.0 / 96.0);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function makeMaterial(fingerAndFieldGLSL) {
  return new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: { uTime, uLandNear, uLandFar, uWaterNear, uWaterFar, uFoam },
    vertexShader: VERTEX_SHADER,
    fragmentShader: GLSL_HEADER + fingerAndFieldGLSL + GLSL_MAIN,
  });
}

// ---------------------------------------------------------------------------
// 1. Swash Pulse -- independent per-ribbon timer: rush in, drain, rest.
// ---------------------------------------------------------------------------
function makeSwashPulse() {
  return makeMaterial(/* glsl */ `
    float finger(float u, float v, float cellId){
      float seed = cellId * 91.7;
      float rootU   = mix(0.35, 3.2, hash1(seed + 0.0));
      float rootV   = (hash1(seed + 1.0) - 0.5) * 0.6;
      float L       = mix(1.4, 4.2, hash1(seed + 2.0));
      float W0      = mix(0.10, 0.26, hash1(seed + 3.0));
      float phase01 = hash1(seed + 4.0);
      float per     = 5.5 * mix(0.85, 1.4, hash1(seed + 5.0));

      float t = fract(uTime / per + phase01);
      float rise = smoothstep(0.0, 0.10, t);
      float fall = smoothstep(0.10, 0.42, t);
      float life = clamp(rise - fall, 0.0, 1.0);
      float halfLc = 0.5 * L * life;
      if (halfLc < 0.02) return 0.0;

      float lv = v - rootV;
      float vNorm = clamp(abs(lv) / halfLc, 0.0, 1.5);
      if (vNorm > 1.05) return 0.0;

      float meander = fbm(vec2(lv * 1.6 + seed, rootU * 0.7 + uTime * 0.06));
      float centerU = rootU + meander * 0.45 * vNorm * vNorm;

      float raggedNoise = fbm(vec2(lv * 3.4 - seed * 2.1, rootU * 2.0 - uTime * 0.12));
      float halfWidth = W0 * (1.0 - 0.6 * vNorm) + 0.012;
      halfWidth = max(halfWidth + raggedNoise * 0.1 * vNorm, 0.0);

      float dist = abs(u - centerU);
      float aa = min(fwidth(dist) * 1.4, 0.05) + 0.01;
      float mask = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);
      mask *= 1.0 - smoothstep(0.88, 1.05, vNorm);
      return mask;
    }

    float foamField(float u, float v){
      float best = 0.0;
      float cellSize = 1.7;
      float baseCell = floor(v / cellSize);
      for(int i = -1; i <= 1; i++){
        float cell = baseCell + float(i);
        float lv = v - cell * cellSize;
        best = max(best, finger(u, lv, cell));
      }
      float cellSize2 = 3.3;
      float baseCell2 = floor(v / cellSize2) + 100.0;
      for(int i = -1; i <= 1; i++){
        float cell = baseCell2 + float(i);
        float lv = v - (cell - 100.0) * cellSize2;
        best = max(best, finger(u, lv, cell + 500.0));
      }
      return clamp(best, 0.0, 1.0);
    }
  `);
}

// ---------------------------------------------------------------------------
// 2. Traveling Surge -- a band of activation sweeps along the shore.
// ---------------------------------------------------------------------------
function makeTravelingSurge() {
  return makeMaterial(/* glsl */ `
    float finger(float u, float v, float cellId, float cellSize){
      float seed = cellId * 77.3;
      float rootU = mix(0.4, 3.6, hash1(seed + 0.0));
      float rootV = (hash1(seed + 1.0) - 0.5) * 0.7;
      float L     = mix(1.8, 5.0, hash1(seed + 2.0));
      float W0    = mix(0.11, 0.27, hash1(seed + 3.0));
      float jitter = hash1(seed + 4.0);

      // reconstruct an along-shore position from the cell index so the
      // activation band travels continuously across cell boundaries
      float globalV = cellId * cellSize;
      float t = fract(globalV * 0.10 - uTime * 0.30 + jitter);
      float rise = smoothstep(0.0, 0.08, t);
      float fall = smoothstep(0.08, 0.55, t);
      float life = clamp(rise - fall, 0.0, 1.0);
      float halfLc = 0.5 * L * life;
      if (halfLc < 0.02) return 0.0;

      float lv = v - rootV;
      float vNorm = clamp(abs(lv) / halfLc, 0.0, 1.5);
      if (vNorm > 1.05) return 0.0;

      float meander = fbm(vec2(lv * 1.6 + seed, rootU * 0.7 + uTime * 0.06));
      float centerU = rootU + meander * 0.45 * vNorm * vNorm;

      float raggedNoise = fbm(vec2(lv * 3.4 - seed * 2.1, rootU * 2.0 - uTime * 0.12));
      float halfWidth = W0 * (1.0 - 0.6 * vNorm) + 0.012;
      halfWidth = max(halfWidth + raggedNoise * 0.1 * vNorm, 0.0);

      float dist = abs(u - centerU);
      float aa = min(fwidth(dist) * 1.4, 0.05) + 0.01;
      float mask = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);
      mask *= 1.0 - smoothstep(0.88, 1.05, vNorm);
      return mask;
    }

    float foamField(float u, float v){
      float best = 0.0;
      float cellSize = 2.0;
      float baseCell = floor(v / cellSize);
      for(int i = -1; i <= 1; i++){
        float cell = baseCell + float(i);
        float lv = v - cell * cellSize;
        best = max(best, finger(u, lv, cell, cellSize));
      }
      float cellSize2 = 3.6;
      float baseCell2 = floor(v / cellSize2) + 100.0;
      for(int i = -1; i <= 1; i++){
        float cell = baseCell2 + float(i);
        float lv = v - (cell - 100.0) * cellSize2;
        best = max(best, finger(u, lv, cell + 500.0, cellSize2));
      }
      return clamp(best, 0.0, 1.0);
    }
  `);
}

// ---------------------------------------------------------------------------
// 3. Slow Tide Breathing -- big, mostly-synchronized swell.
// ---------------------------------------------------------------------------
function makeSlowTide() {
  return makeMaterial(/* glsl */ `
    float finger(float u, float v, float cellId){
      float seed = cellId * 63.1;
      float rootU = mix(0.6, 3.0, hash1(seed + 0.0));
      float rootV = (hash1(seed + 1.0) - 0.5) * 0.5;
      float Lmax  = mix(2.4, 6.0, hash1(seed + 2.0));
      float W0    = mix(0.14, 0.32, hash1(seed + 3.0));
      float desync = (hash1(seed + 4.0) - 0.5) * 0.15; // small per-ribbon offset

      float period = 9.0;
      float t = fract(uTime / period + desync);
      float rise = smoothstep(0.0, 0.22, t);
      float fall = smoothstep(0.22, 0.85, t);
      float life = clamp(rise - fall, 0.0, 1.0);
      float halfLc = 0.5 * Lmax * life;
      if (halfLc < 0.02) return 0.0;

      float lv = v - rootV;
      float vNorm = clamp(abs(lv) / halfLc, 0.0, 1.5);
      if (vNorm > 1.05) return 0.0;

      float meander = fbm(vec2(lv * 1.1 + seed, rootU * 0.5 + uTime * 0.03));
      float centerU = rootU + meander * 0.5 * vNorm * vNorm;

      float raggedNoise = fbm(vec2(lv * 2.4 - seed * 1.7, rootU * 1.4 - uTime * 0.05));
      float halfWidth = W0 * (1.0 - 0.55 * vNorm) + 0.015;
      halfWidth = max(halfWidth + raggedNoise * 0.09 * vNorm, 0.0);

      float dist = abs(u - centerU);
      float aa = min(fwidth(dist) * 1.4, 0.05) + 0.01;
      float mask = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);
      mask *= 1.0 - smoothstep(0.88, 1.05, vNorm);
      return mask;
    }

    float foamField(float u, float v){
      float best = 0.0;
      float cellSize = 2.6;
      float baseCell = floor(v / cellSize);
      for(int i = -1; i <= 1; i++){
        float cell = baseCell + float(i);
        float lv = v - cell * cellSize;
        best = max(best, finger(u, lv, cell));
      }
      float cellSize2 = 4.8;
      float baseCell2 = floor(v / cellSize2) + 100.0;
      for(int i = -1; i <= 1; i++){
        float cell = baseCell2 + float(i);
        float lv = v - (cell - 100.0) * cellSize2;
        best = max(best, finger(u, lv, cell + 500.0));
      }
      return clamp(best, 0.0, 1.0);
    }
  `);
}

// ---------------------------------------------------------------------------
// 4. Rapid Flicker -- short-lived, small, near-constant turbulent chop.
// ---------------------------------------------------------------------------
function makeRapidFlicker() {
  return makeMaterial(/* glsl */ `
    float finger(float u, float v, float cellId){
      float seed = cellId * 111.9;
      float rootU   = mix(0.25, 2.2, hash1(seed + 0.0));
      float rootV   = (hash1(seed + 1.0) - 0.5) * 0.4;
      float L       = mix(0.8, 2.6, hash1(seed + 2.0));
      float W0      = mix(0.07, 0.18, hash1(seed + 3.0));
      float phase01 = hash1(seed + 4.0);
      float per     = mix(0.9, 1.8, hash1(seed + 5.0));

      float t = fract(uTime / per + phase01);
      float rise = smoothstep(0.0, 0.18, t);
      float fall = smoothstep(0.18, 0.85, t); // barely any idle gap
      float life = clamp(rise - fall, 0.0, 1.0);
      float halfLc = 0.5 * L * life;
      if (halfLc < 0.015) return 0.0;

      float lv = v - rootV;
      float vNorm = clamp(abs(lv) / halfLc, 0.0, 1.5);
      if (vNorm > 1.05) return 0.0;

      float meander = fbm(vec2(lv * 3.0 + seed, rootU * 1.2 + uTime * 0.35));
      float centerU = rootU + meander * 0.35 * vNorm * vNorm;

      float raggedNoise = fbm(vec2(lv * 6.0 - seed * 2.6, rootU * 3.0 - uTime * 0.5));
      float halfWidth = W0 * (1.0 - 0.5 * vNorm) + 0.01;
      halfWidth = max(halfWidth + raggedNoise * 0.16 * vNorm, 0.0);

      float dist = abs(u - centerU);
      float aa = min(fwidth(dist) * 1.4, 0.05) + 0.01;
      float mask = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);
      mask *= 1.0 - smoothstep(0.85, 1.05, vNorm);
      return mask;
    }

    float foamField(float u, float v){
      float best = 0.0;
      float cellSize = 0.9;
      float baseCell = floor(v / cellSize);
      for(int i = -1; i <= 1; i++){
        float cell = baseCell + float(i);
        float lv = v - cell * cellSize;
        best = max(best, finger(u, lv, cell));
      }
      float cellSize2 = 1.8;
      float baseCell2 = floor(v / cellSize2) + 100.0;
      for(int i = -1; i <= 1; i++){
        float cell = baseCell2 + float(i);
        float lv = v - (cell - 100.0) * cellSize2;
        best = max(best, finger(u, lv, cell + 500.0));
      }
      return clamp(best, 0.0, 1.0);
    }
  `);
}

// ---------------------------------------------------------------------------
// 5. Drifting Foam -- pulses in place while swaying along the shore.
// ---------------------------------------------------------------------------
function makeDriftingFoam() {
  return makeMaterial(/* glsl */ `
    float finger(float u, float v, float cellId){
      float seed = cellId * 143.7;
      float rootU    = mix(0.4, 3.2, hash1(seed + 0.0));
      float rootV0   = (hash1(seed + 1.0) - 0.5) * 0.6;
      float driftAmp   = mix(0.6, 1.3, hash1(seed + 6.0));
      float driftSpeed = mix(0.15, 0.4, hash1(seed + 7.0));
      float driftPhase = hash1(seed + 8.0) * 6.2831;
      float rootV = rootV0 + sin(uTime * driftSpeed + driftPhase) * driftAmp;

      float L       = mix(1.5, 4.0, hash1(seed + 2.0));
      float W0      = mix(0.10, 0.24, hash1(seed + 3.0));
      float phase01 = hash1(seed + 4.0);
      float per     = mix(3.5, 6.0, hash1(seed + 5.0));

      float t = fract(uTime / per + phase01);
      float rise = smoothstep(0.0, 0.12, t);
      float fall = smoothstep(0.12, 0.55, t);
      float life = clamp(rise - fall, 0.0, 1.0);
      float halfLc = 0.5 * L * life;
      if (halfLc < 0.02) return 0.0;

      float lv = v - rootV;
      float vNorm = clamp(abs(lv) / halfLc, 0.0, 1.5);
      if (vNorm > 1.05) return 0.0;

      float meander = fbm(vec2(lv * 1.5 + seed, rootU * 0.7 + uTime * 0.08));
      float centerU = rootU + meander * 0.4 * vNorm * vNorm;

      float raggedNoise = fbm(vec2(lv * 3.2 - seed * 2.0, rootU * 1.9 - uTime * 0.15));
      float halfWidth = W0 * (1.0 - 0.6 * vNorm) + 0.012;
      halfWidth = max(halfWidth + raggedNoise * 0.1 * vNorm, 0.0);

      float dist = abs(u - centerU);
      float aa = min(fwidth(dist) * 1.4, 0.05) + 0.01;
      float mask = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);
      mask *= 1.0 - smoothstep(0.88, 1.05, vNorm);
      return mask;
    }

    float foamField(float u, float v){
      float best = 0.0;
      float cellSize = 1.8;
      float baseCell = floor(v / cellSize);
      for(int i = -1; i <= 1; i++){
        float cell = baseCell + float(i);
        float lv = v - cell * cellSize;
        best = max(best, finger(u, lv, cell));
      }
      float cellSize2 = 3.4;
      float baseCell2 = floor(v / cellSize2) + 100.0;
      for(int i = -1; i <= 1; i++){
        float cell = baseCell2 + float(i);
        float lv = v - (cell - 100.0) * cellSize2;
        best = max(best, finger(u, lv, cell + 500.0));
      }
      return clamp(best, 0.0, 1.0);
    }
  `);
}

// ---------------------------------------------------------------------------
// Assemble the gallery
// ---------------------------------------------------------------------------
const variants = [
  { name: 'Swash Pulse', desc: 'wave washes up, drains, then rests', make: makeSwashPulse },
  { name: 'Traveling Surge', desc: 'a band of foam sweeps along the bank', make: makeTravelingSurge },
  { name: 'Slow Tide Breathing', desc: 'big, slow synchronized swell', make: makeSlowTide },
  { name: 'Rapid Flicker', desc: 'fast, choppy, ever-present foam', make: makeRapidFlicker },
  { name: 'Drifting Foam', desc: 'ribbons sway sideways as they pulse', make: makeDriftingFoam },
];

const floor = new THREE.Mesh(geo, variants[0].make());
scene.add(floor);

const materialCache = new Map();
function selectVariant(i) {
  const v = variants[i];
  if (!materialCache.has(i)) materialCache.set(i, v.make());
  floor.material = materialCache.get(i);
  document.getElementById('variant-title').textContent = v.name;
  document.getElementById('variant-desc').textContent = v.desc;
  [...document.querySelectorAll('.variant-btn')].forEach((btn, bi) =>
    btn.classList.toggle('active', bi === i)
  );
}
materialCache.set(0, floor.material);

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const panel = document.createElement('div');
panel.id = 'panel';
panel.innerHTML = `
  <div id="variant-title"></div>
  <div id="variant-desc"></div>
  <div id="variant-buttons"></div>
`;
document.body.appendChild(panel);

const btnRow = panel.querySelector('#variant-buttons');
variants.forEach((v, i) => {
  const b = document.createElement('button');
  b.className = 'variant-btn';
  b.textContent = i + 1;
  b.title = v.name;
  b.addEventListener('click', () => selectVariant(i));
  btnRow.appendChild(b);
});
selectVariant(0);

// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  uTime.value = clock.getElapsedTime();
  controls.update();
  renderer.render(scene, camera);
}
animate();
