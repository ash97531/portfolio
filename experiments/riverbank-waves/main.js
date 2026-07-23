import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * Riverbank rolling waves -- a different foam pattern from the ribbon
 * fingers in experiments/riverbank(-gallery)/.
 *
 * Instead of discrete shapes rooted at the shoreline, this is a
 * continuous field: parallel-ish wave-crest BANDS that travel toward the
 * shore over time (their spacing/curve follows the shoreline automatically
 * because they're defined purely in "distance from shore" space), broken
 * up by noise so each band reads as patchy foam rather than a clean line,
 * plus a turbulent BREAKING ZONE right at the waterline where the incoming
 * bands froth into whitewash.
 *
 * Three tunings of the same idea: a calm swell, the baseline roll, and a
 * choppy storm -- same mechanism, different pacing/turbulence.
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

const GLSL_HEADER = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec3 uLandNear, uLandFar, uWaterNear, uWaterFar, uFoam;
  varying vec3 vWorld;

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

function makeMaterial(foamFieldGLSL) {
  return new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: { uTime, uLandNear, uLandFar, uWaterNear, uWaterFar, uFoam },
    vertexShader: VERTEX_SHADER,
    fragmentShader: GLSL_HEADER + foamFieldGLSL + GLSL_MAIN,
  });
}

// GLSL float literals need an explicit decimal point (smoothstep etc.
// reject mixed int/float args); JS's default number->string drops the
// trailing ".0", so format every interpolated constant through this.
function f(n) {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

// A parametrized "rolling wave bands + breaking whitewash" field. Bands are
// defined purely in u (distance from shore), so they automatically follow
// the shoreline's curve; noise breaks their coverage into patchy foam
// instead of a clean ribbon or sine line.
function rollingWaveGLSL({
  spacing,
  speed,
  widthNear,
  widthFar,
  coverFreq,
  coverThreshold,
  farFadeStart,
  farFadeEnd,
  breakReach,
  breakFreq,
  breakSpeed,
  breakThreshold,
}) {
  return /* glsl */ `
    float foamField(float u, float v){
      float wave = 0.0;
      if (u > -1.0) {
        float travel = (u + uTime * ${f(speed)}) / ${f(spacing)};
        float bandPhase = fract(travel);
        float bandDist = min(bandPhase, 1.0 - bandPhase);

        // jag the crest line itself, not just its brightness, so it reads
        // as a broken foam edge rather than a clean parallel curve
        float edgeWarp = fbm(vec2(v * ${f(coverFreq * 1.8)} + 31.0, u * 0.5 - uTime * 0.15));
        bandDist += edgeWarp * 0.07;

        float n = fbm(vec2(v * ${f(coverFreq)} - uTime * 0.12, u * 0.35));
        float coverage = smoothstep(${f(coverThreshold)}, ${f(coverThreshold + 0.3)}, n * 0.5 + 0.5);

        float nearT = 1.0 - smoothstep(0.0, 7.0, u);
        float bandWidth = mix(${f(widthFar)}, ${f(widthNear)}, nearT);

        float aa = min(fwidth(bandDist) * 1.4, 0.04) + 0.006;
        float crestMask = 1.0 - smoothstep(bandWidth - aa, bandWidth + aa, bandDist);
        crestMask *= coverage;

        float farFade = 1.0 - smoothstep(${f(farFadeStart)}, ${f(farFadeEnd)}, u);
        wave = crestMask * farFade;
      }

      // turbulent whitewash right where the bands reach the bank
      float breakZoneT = 1.0 - smoothstep(0.0, ${f(breakReach)}, abs(u));
      float turb = fbm(vec2(v * ${f(breakFreq)} + uTime * ${f(breakSpeed)}, u * 1.8 - uTime * ${f(breakSpeed)} * 1.4));
      float breakMask = smoothstep(${f(breakThreshold)}, ${f(breakThreshold + 0.35)}, turb * 0.5 + 0.5) * breakZoneT;
      breakMask *= smoothstep(-1.5, 0.3, u);

      return clamp(max(wave, breakMask), 0.0, 1.0);
    }
  `;
}

// ---------------------------------------------------------------------------
// 1. Rolling Crests -- the baseline: even, legible bands rolling in.
// ---------------------------------------------------------------------------
function makeRollingCrests() {
  return makeMaterial(
    rollingWaveGLSL({
      spacing: 2.4,
      speed: 0.6,
      widthNear: 0.14,
      widthFar: 0.05,
      coverFreq: 1.3,
      coverThreshold: 0.45,
      farFadeStart: 9.0,
      farFadeEnd: 13.0,
      breakReach: 2.0,
      breakFreq: 2.4,
      breakSpeed: 0.35,
      breakThreshold: 0.08,
    })
  );
}

// ---------------------------------------------------------------------------
// 2. Gentle Swell -- slow, wide-spaced, soft, calm breaking.
// ---------------------------------------------------------------------------
function makeGentleSwell() {
  return makeMaterial(
    rollingWaveGLSL({
      spacing: 3.6,
      speed: 0.32,
      widthNear: 0.10,
      widthFar: 0.04,
      coverFreq: 0.9,
      coverThreshold: 0.25,
      farFadeStart: 10.0,
      farFadeEnd: 14.0,
      breakReach: 1.3,
      breakFreq: 1.6,
      breakSpeed: 0.18,
      breakThreshold: 0.22,
    })
  );
}

// ---------------------------------------------------------------------------
// 3. Storm Chop -- fast, dense, ragged bands and heavy whitewash.
// ---------------------------------------------------------------------------
function makeStormChop() {
  return makeMaterial(
    rollingWaveGLSL({
      spacing: 1.5,
      speed: 1.4,
      widthNear: 0.20,
      widthFar: 0.08,
      coverFreq: 2.2,
      coverThreshold: 0.55,
      farFadeStart: 8.0,
      farFadeEnd: 13.0,
      breakReach: 3.2,
      breakFreq: 3.4,
      breakSpeed: 0.6,
      breakThreshold: -0.05,
    })
  );
}

// ---------------------------------------------------------------------------
// Assemble the gallery
// ---------------------------------------------------------------------------
const variants = [
  { name: 'Rolling Crests', desc: 'even bands rolling toward the bank', make: makeRollingCrests },
  { name: 'Gentle Swell', desc: 'slow, soft, wide-spaced waves', make: makeGentleSwell },
  { name: 'Storm Chop', desc: 'fast, dense, ragged whitewash', make: makeStormChop },
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
