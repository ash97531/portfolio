import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * Riverbank swash foam.
 *
 * Not an island: one flat floor, split in half by a shoreline -- land on
 * one side, water on the other. The foam is not a texture on the water,
 * it's a set of individual FINGERS rooted at the shoreline that reach out
 * into the water: smooth and rounded at the root, meandering and jagged
 * toward the tip, each one pulsing outward and slowly receding on its own
 * timer. That's what backwash/swash foam actually looks like on a bank.
 *
 * Everything is one unlit ShaderMaterial on a single flat PlaneGeometry --
 * no vertex displacement, no lighting model -- to match the flat, painterly
 * gradient look of the reference.
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
// One flat floor, split into land (+X) and water (-X) by a wavy shoreline.
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

const material = new THREE.ShaderMaterial({
  extensions: { derivatives: true },
  uniforms: { uTime, uLandNear, uLandFar, uWaterNear, uWaterFar, uFoam },
  vertexShader: /* glsl */ `
    varying vec3 vWorld;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorld = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: /* glsl */ `
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

    // Shoreline: a gently wavy curve giving the land/water split, land on
    // the +X side. Returns signed distance-ish: >0 land, <0 water.
    float shoreX(float z){
      return sin(z * 0.14 + 1.3) * 1.6 + fbm(vec2(z * 0.08, z * 0.031 + 4.0)) * 1.4;
    }

    // A single foam ribbon floating near the shoreline: elongated ALONG the
    // shore (the v axis), tapering to a point at both ends, sitting a short
    // distance out in the water (u axis). Smooth and straight at its
    // centre, meandering and ragged toward its two tips. Pulses in and
    // slowly recedes on its own timer so ribbons don't all breathe in
    // lockstep.
    float finger(float u, float v, float cellId, float period){
      float seed = cellId * 91.7;
      float rootU   = mix(0.35, 3.2, hash1(seed + 0.0));  // how far out in the water
      float rootV   = (hash1(seed + 1.0) - 0.5) * 0.6;    // jitter along shore
      float L       = mix(1.4, 4.2, hash1(seed + 2.0));   // full reach along shore
      float W0      = mix(0.10, 0.26, hash1(seed + 3.0)); // centre half-width
      float phase01 = hash1(seed + 4.0);
      float per     = period * mix(0.85, 1.4, hash1(seed + 5.0));

      float t = fract(uTime / per + phase01);
      // fast rush-in, slower recede, then a real idle gap before the next
      // pulse -- a wave washes up, drains, and the sand sits bare a while.
      float rise = smoothstep(0.0, 0.10, t);
      float fall = smoothstep(0.10, 0.42, t);
      float life = clamp(rise - fall, 0.0, 1.0);
      float halfLc = 0.5 * L * life;
      if (halfLc < 0.02) return 0.0;

      float lv = v - rootV;
      float vNorm = clamp(abs(lv) / halfLc, 0.0, 1.5);
      if (vNorm > 1.05) return 0.0;

      // meander grows toward the tips; the centre stays smooth/straight
      float meander = fbm(vec2(lv * 1.6 + seed, rootU * 0.7 + uTime * 0.06));
      float centerU = rootU + meander * 0.45 * vNorm * vNorm;

      float raggedNoise = fbm(vec2(lv * 3.4 - seed * 2.1, rootU * 2.0 - uTime * 0.12));
      float halfWidth = W0 * (1.0 - 0.6 * vNorm) + 0.012;
      halfWidth = max(halfWidth + raggedNoise * 0.1 * vNorm, 0.0);

      float dist = abs(u - centerU);
      // fwidth() spikes at the hash-driven cell boundaries above (adjacent
      // fingers' properties jump discontinuously there); an unclamped band
      // can invert smoothstep's edges and paint a stray line, so cap it.
      float aa = min(fwidth(dist) * 1.4, 0.05) + 0.01;
      float mask = 1.0 - smoothstep(halfWidth - aa, halfWidth + aa, dist);

      mask *= 1.0 - smoothstep(0.88, 1.05, vNorm); // soft tapered tips, both ends
      return mask;
    }

    // Scan the shore cells near this fragment's along-shore position and
    // take the strongest finger covering it. Two independent cell grids
    // (different sizes/periods) give a mix of quick small fingers and
    // longer, slower ones -- reads less mechanical than one grid alone.
    float foamField(float u, float v){
      float best = 0.0;
      float cellSize = 1.7;
      float baseCell = floor(v / cellSize);
      for(int i = -1; i <= 1; i++){
        float cell = baseCell + float(i);
        float lv = v - cell * cellSize;
        best = max(best, finger(u, lv, cell, 5.5));
      }
      float cellSize2 = 3.3;
      float baseCell2 = floor(v / cellSize2) + 100.0;
      for(int i = -1; i <= 1; i++){
        float cell = baseCell2 + float(i);
        float lv = v - (cell - 100.0) * cellSize2;
        best = max(best, finger(u, lv, cell + 500.0, 8.0));
      }
      return clamp(best, 0.0, 1.0);
    }

    void main(){
      float shore = vWorld.x - shoreX(vWorld.z);   // >0 land, <0 water
      float u = -shore;                             // distance into water

      // wide, soft blend between land and water colour (painterly, not a hard line)
      float blend = smoothstep(-7.0, 7.0, shore);
      float landT = smoothstep(0.0, 13.0, shore);
      float waterT = smoothstep(0.0, 13.0, u);
      vec3 land = mix(uLandNear, uLandFar, landT);
      vec3 water = mix(uWaterNear, uWaterFar, waterT);
      vec3 col = mix(water, land, blend);

      // faint diamond grid on solid land only, away from the blend zone
      vec2 g = vec2(vWorld.x + vWorld.z, vWorld.x - vWorld.z) * 0.55;
      float gridLine = min(abs(fract(g.x) - 0.5), abs(fract(g.y) - 0.5));
      float diamond = 1.0 - smoothstep(0.0, 0.025, gridLine);
      float landMask = smoothstep(1.0, 6.0, shore);
      col = mix(col, col * 0.9, diamond * landMask * 0.6);

      float foam = foamField(u, vWorld.z);
      col = mix(col, uFoam, foam);

      // gentle depth vignette so far ground reads darker, near reads clearer
      float d = length(vWorld - cameraPosition);
      col = mix(col, col * 0.6, smoothstep(10.0, 30.0, d) * 0.5);

      // dither to break up 8-bit banding on the smooth colour gradient
      col += (hash21(gl_FragCoord.xy) - 0.5) * (1.0 / 96.0);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const floor = new THREE.Mesh(geo, material);
scene.add(floor);

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
