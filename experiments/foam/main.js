import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * Jagged "flame/lightning" foam water — procedural GLSL.
 *
 * The look comes from four ideas working together:
 *   1. RIDGED noise  ->  1.0 - abs(noise) makes thin sharp crest-lines
 *      (the lightning-like veins) instead of soft blobs.
 *   2. ANISOTROPIC sampling  ->  sample the noise stretched (high freq on X,
 *      low freq on Y) so the shapes run vertically like flames.
 *   3. DOMAIN WARP  ->  push the sample coordinate around with another noise
 *      so the veins lick, jag and morph rather than sit still.
 *   4. CRISP THRESHOLD  ->  smoothstep with an fwidth-sized band gives high-
 *      contrast graphic edges that stay anti-aliased but never blurry.
 * Animation is a single uTime uniform advanced in the render loop.
 */

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a86);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(0, 15, 9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

// ---------------------------------------------------------------------------
// Foam water material
// ---------------------------------------------------------------------------
const foamMaterial = new THREE.ShaderMaterial({
  // fwidth() needs derivatives (auto-on under WebGL2, explicit for WebGL1).
  extensions: { derivatives: true },
  uniforms: {
    uTime: { value: 0 },
    // travel direction of the foam across the surface
    uFlow: { value: new THREE.Vector2(0.04, 0.16) },
    // water base gradient + foam colours (swap these for your palette)
    uDeep: { value: new THREE.Color(0x3a34c0) },
    uMid: { value: new THREE.Color(0x6f6ff0) },
    uHalo: { value: new THREE.Color(0xb9b0ff) },
    uFoam: { value: new THREE.Color(0xffffff) },
    // shape controls
    uStretch: { value: new THREE.Vector2(7.5, 2.0) }, // X freq, Y freq
    uSharpness: { value: 1.4 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    precision highp float;

    uniform float uTime;
    uniform vec2  uFlow;
    uniform vec3  uDeep;
    uniform vec3  uMid;
    uniform vec3  uHalo;
    uniform vec3  uFoam;
    uniform vec2  uStretch;
    uniform float uSharpness;
    varying vec2 vUv;

    // --- Ashima 3D simplex noise -----------------------------------------
    vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
    vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v){
      const vec2  C = vec2(1.0/6.0, 1.0/3.0);
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod(i, 289.0);
      vec4 p = permute(permute(permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 1.0/7.0;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    // Fractal noise in ~[-1,1]; jagged because it stacks sharp octaves.
    float fbm(vec3 p){
      float a = 0.5, s = 0.0;
      for(int i = 0; i < 4; i++){
        s += a * snoise(p);
        p = p * 2.03 + 1.7;
        a *= 0.5;
      }
      return s;
    }

    // A foam patch along the contour n == L, with its thickness modulated by
    // a second noise m: where m dips low the patch pinches to nothing, which
    // breaks the contour into DISCRETE jagged shapes that swell, shrink and
    // dissipate as the noises evolve. Edges are anti-aliased with fwidth but
    // stay a hard graphic silhouette.
    float foamPatch(float n, float m, float L, float widthScale){
      float halfW = max(m, 0.0) * widthScale;  // noise-space half thickness
      float d  = abs(n - L);
      float aa = fwidth(n) * 1.5 + 0.0015;
      float shape = 1.0 - smoothstep(halfW - aa, halfW + aa, d);
      // fully kill the patch where the gate noise is closed, otherwise the
      // AA band leaves a hairline tracing the whole contour
      return shape * smoothstep(0.0, 0.12, m);
    }

    void main(){
      // Stretch so features run tall & thin -> flame-like verticals.
      vec2 st = vUv * uStretch;

      // Time drives travel (xy scroll) and morph/dissipation (z evolution).
      float t = uTime;
      vec3 flow = vec3(uFlow * t, t * 0.28);

      // Domain warp: shove the coordinate with a low-freq noise, biased
      // horizontally, so the shapes lick sideways and jag as they rise.
      float wxN = fbm(vec3(st * 0.45 + 11.0, t * 0.15));
      float wyN = fbm(vec3(st * 0.45 - 7.0,  t * 0.15));
      vec2 stw = st + vec2(wxN, wyN * 0.35) * 1.15;

      // Field whose contours the foam follows...
      float n = fbm(vec3(stw, 0.0) + flow);
      // ...and an independent slower noise that gates patch thickness
      // (negative = gap, positive = filled patch).
      float m = fbm(vec3(stw * 0.7 + 31.0, t * 0.22)) * 1.4 - 0.15;

      float ws = 0.10 * uSharpness;
      float core = 0.0;
      core = max(core, foamPatch(n, m,                    -0.35, ws));
      core = max(core, foamPatch(n, m,                     0.15, ws));
      // reuse m sampled elsewhere so levels don't gate identically
      float m2 = fbm(vec3(stw * 0.7 - 23.0, t * 0.22)) * 1.4 - 0.15;
      core = max(core, foamPatch(n, m2,                    0.62, ws));

      // Wider, fainter pass = lavender aura hugging each foam patch.
      float halo = 0.0;
      halo = max(halo, foamPatch(n, m  + 0.25, -0.35, ws * 2.2));
      halo = max(halo, foamPatch(n, m  + 0.25,  0.15, ws * 2.2));
      halo = max(halo, foamPatch(n, m2 + 0.25,  0.62, ws * 2.2));

      // Base water gradient (deep -> lighter toward +X, tweak to taste).
      vec3 col = mix(uDeep, uMid, smoothstep(-0.2, 1.1, vUv.x));
      col = mix(col, uHalo, halo * 0.55);
      col = mix(col, uFoam, core);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

const water = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30, 1, 1),
  foamMaterial
);
water.rotation.x = -Math.PI / 2; // lay flat as a water surface
scene.add(water);

// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  foamMaterial.uniforms.uTime.value = clock.getElapsedTime();
  controls.update();
  renderer.render(scene, camera);
}
animate();
