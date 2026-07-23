import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * River wave gallery.
 *
 * A small bounded plane (not an infinite ocean) with one piece of land
 * sitting in the middle, river water flowing around it on every side.
 * The water plane's MATERIAL is swappable at runtime between five distinct
 * wave techniques -- pick whichever reads best for your scene and lift its
 * ShaderMaterial block wholesale.
 *
 *   1. Gentle Ripple Flow  - layered sine ripples drifting downstream
 *   2. Gerstner Current    - summed Gerstner waves, real peaked crests
 *   3. Rapids Foam Streaks - fbm noise stretched into long foam trails
 *   4. Toon Banded River   - posterized cel-shaded flat-color bands
 *   5. Cross-Chop Ripples  - two ripple fields crossing at an angle
 *
 * All five share the same land/water geometry and the same uTime /
 * uFlowDir uniforms, so switching is just: waterMesh.material = variant.
 */

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaed4e0);
scene.fog = new THREE.Fog(0xaed4e0, 30, 60);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);
camera.position.set(2, 12, 15);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 6;
controls.maxDistance = 34;
controls.maxPolarAngle = Math.PI * 0.48;
controls.target.set(0, 0.4, 0);

const hemi = new THREE.HemisphereLight(0xdff2ff, 0x3a5a3a, 0.95);
const sun = new THREE.DirectionalLight(0xfff2d6, 1.9);
sun.position.set(10, 16, 6);
scene.add(hemi, sun);

// ---------------------------------------------------------------------------
// Bounded plane + one piece of land, river water on every side
// ---------------------------------------------------------------------------
const PLANE_W = 26; // river runs along X
const PLANE_D = 14;
const LAND_RX = 7.2; // land ellipse elongated along the flow direction
const LAND_RZ = 2.4;
const CHANNEL_DEPTH = -1.4; // resting riverbed height, well under water level
const WATER_LEVEL = 0;

function hash(x, z) {
  return Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
}
function noise2(x, z) {
  const xi = Math.floor(x),
    zi = Math.floor(z);
  const xf = x - xi,
    zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = Math.sin(hash(xi, zi)) * 0.5 + 0.5;
  const b = Math.sin(hash(xi + 1, zi)) * 0.5 + 0.5;
  const c = Math.sin(hash(xi, zi + 1)) * 0.5 + 0.5;
  const d = Math.sin(hash(xi + 1, zi + 1)) * 0.5 + 0.5;
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}

function landHeight(x, z) {
  // elliptical dome for the landmass
  const q0 = x / LAND_RX,
    q1 = z / LAND_RZ;
  const r = THREE.MathUtils.clamp(Math.sqrt(q0 * q0 + q1 * q1), 0, 1);
  const dome = Math.cos(r * Math.PI * 0.5);
  const domeH = dome * dome * 3.2;

  // low grassy rim right at the plane's outer edge (the far riverbanks)
  const distX = PLANE_W / 2 - Math.abs(x);
  const distZ = PLANE_D / 2 - Math.abs(z);
  const edgeDist = Math.min(distX, distZ);
  const bankW = 2.2;
  const bankT = THREE.MathUtils.clamp(1 - edgeDist / bankW, 0, 1);
  const bankH = bankT * bankT * 1.6;

  let h = Math.max(domeH, bankH) + CHANNEL_DEPTH;
  h += (noise2(x * 0.3, z * 0.3) - 0.5) * 0.5 * (h > -0.3 ? 1 : 0.35);
  return h;
}

function buildTerrain() {
  const seg = 160;
  const geo = new THREE.PlaneGeometry(PLANE_W, PLANE_D, seg, Math.round((seg * PLANE_D) / PLANE_W));
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const bed = new THREE.Color(0x1c4f63);
  const wetSand = new THREE.Color(0xcbb488);
  const sand = new THREE.Color(0xe6d2a0);
  const grass = new THREE.Color(0x5a9d4a);
  const grassDark = new THREE.Color(0x3d7a3a);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = landHeight(x, z);
    pos.setY(i, h);

    if (h < -0.5) {
      const d = THREE.MathUtils.smoothstep(h, -1.6, -0.5);
      tmp.copy(bed).lerp(wetSand, d);
    } else if (h < 0.3) {
      const w = THREE.MathUtils.smoothstep(h, -0.5, 0.3);
      tmp.copy(wetSand).lerp(sand, w);
    } else {
      const g = THREE.MathUtils.smoothstep(h, 0.3, 1.2);
      tmp.copy(sand).lerp(grass, g);
      tmp.lerp(grassDark, THREE.MathUtils.smoothstep(h, 1.6, 2.6) * 0.6);
    }
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })
  );
  scene.add(mesh);
}
buildTerrain();

// ---------------------------------------------------------------------------
// Shared uniforms & GLSL fragments reused by several variants
// ---------------------------------------------------------------------------
const uTime = { value: 0 };
const uFlowDir = { value: new THREE.Vector2(1, 0.06).normalize() };
const uLandRadius = { value: new THREE.Vector2(LAND_RX, LAND_RZ) };
const uPlaneSize = { value: new THREE.Vector2(PLANE_W, PLANE_D) };
const uShallow = { value: new THREE.Color(0x6fc7c9) };
const uDeep = { value: new THREE.Color(0x1d5a7a) };
const uFoam = { value: new THREE.Color(0xffffff) };

// Distance (world units) from a point to the nearest shore -- either the
// island's edge or the plane's own bank -- used by every variant to fade
// colour/foam near the water's edge.
const GLSL_SHORE = /* glsl */ `
  uniform vec2 uLandRadius;
  uniform vec2 uPlaneSize;
  float shoreDist(vec2 p){
    vec2 q = p / uLandRadius;
    float landEdge = abs(length(q) - 1.0) * min(uLandRadius.x, uLandRadius.y);
    vec2 edge2 = uPlaneSize * 0.5 - abs(p);
    float bankEdge = min(edge2.x, edge2.y);
    return min(landEdge, max(bankEdge, 0.0));
  }
`;

const GLSL_HASH_NOISE = /* glsl */ `
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
    for(int i = 0; i < 5; i++){
      s += a * (vnoise(p) * 2.0 - 1.0);
      p = p * 2.02 + 3.1;
      a *= 0.55;
    }
    return s;
  }
`;

function planeGeo() {
  return new THREE.PlaneGeometry(PLANE_W, PLANE_D, 220, 120).rotateX(-Math.PI / 2);
}

// ---------------------------------------------------------------------------
// 1. Gentle Ripple Flow -- layered sines drifting downstream
// ---------------------------------------------------------------------------
function makeRippleFlow() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime, uFlowDir, uShallow, uDeep, uFoam, uLandRadius, uPlaneSize },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;
      varying float vWave;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float phase = dot(wp.xz, uFlowDir) * 0.9 - uTime * 1.4;
        float h = sin(phase) * 0.09 + sin(phase * 2.3 + 1.7) * 0.045;
        wp.y += h;
        vWave = h;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_SHORE}
      uniform vec3 uShallow, uDeep, uFoam;
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;
      varying float vWave;
      void main(){
        float shore = shoreDist(vWorld.xz);
        float depth = smoothstep(0.0, 9.0, shore);
        vec3 col = mix(uShallow, uDeep, depth);

        float phase = dot(vWorld.xz, uFlowDir) * 0.9 - uTime * 1.4;
        float glint = smoothstep(0.75, 1.0, sin(phase)) * 0.5;
        col += glint;

        float shoreFoam = 1.0 - smoothstep(0.0, 1.1, shore);
        shoreFoam *= 0.5 + 0.5 * sin(shore * 4.0 - uTime * 3.0);
        col = mix(col, uFoam, clamp(shoreFoam, 0.0, 1.0) * 0.8);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 2. Gerstner Current -- summed Gerstner waves, real peaked crests
// ---------------------------------------------------------------------------
function makeGerstner() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime, uFlowDir, uShallow, uDeep, uFoam, uLandRadius, uPlaneSize },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vSteep;

      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec2 p = wp.xz;
        vec2 base = normalize(uFlowDir);
        vec2 dirs[3];
        dirs[0] = base;
        dirs[1] = normalize(base + vec2(-base.y, base.x) * 0.6);
        dirs[2] = normalize(base + vec2(base.y, -base.x) * 0.35);
        float lens[3];
        lens[0] = 5.2; lens[1] = 3.1; lens[2] = 1.9;
        float amps[3];
        amps[0] = 0.16; amps[1] = 0.09; amps[2] = 0.05;
        float speeds[3];
        speeds[0] = 1.6; speeds[1] = 2.1; speeds[2] = 2.6;

        vec3 offset = vec3(0.0);
        float dHdx = 0.0, dHdz = 0.0;
        for(int i = 0; i < 3; i++){
          vec2 d = dirs[i];
          float L = lens[i];
          float A = amps[i];
          float w = 6.28318 / L;
          float phase = w * dot(d, p) + uTime * speeds[i];
          float s = sin(phase), c = cos(phase);
          offset.x += d.x * A * c;
          offset.z += d.y * A * c;
          offset.y += A * s;
          dHdx += d.x * A * w * c;
          dHdz += d.y * A * w * c;
        }

        wp.xyz += offset;
        vWorld = wp.xyz;
        vNormal = normalize(vec3(-dHdx, 1.0, -dHdz));
        vSteep = offset.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_SHORE}
      uniform vec3 uShallow, uDeep, uFoam;
      varying vec3 vWorld;
      varying vec3 vNormal;
      varying float vSteep;
      void main(){
        float shore = shoreDist(vWorld.xz);
        float depth = smoothstep(0.0, 9.0, shore);
        vec3 col = mix(uShallow, uDeep, depth);

        vec3 lightDir = normalize(vec3(0.4, 0.8, 0.3));
        float diff = max(dot(vNormal, lightDir), 0.0);
        col *= 0.6 + 0.5 * diff;

        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 h = normalize(lightDir + viewDir);
        float spec = pow(max(dot(vNormal, h), 0.0), 60.0);
        col += spec * 0.6;

        float crestFoam = smoothstep(0.23, 0.30, vSteep);
        float shoreFoam = 1.0 - smoothstep(0.0, 0.55, shore);
        col = mix(col, uFoam, clamp(crestFoam + shoreFoam, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 3. Rapids Foam Streaks -- fbm noise stretched long along the current
// ---------------------------------------------------------------------------
function makeRapidsFoam() {
  return new THREE.ShaderMaterial({
    extensions: { derivatives: true },
    uniforms: { uTime, uFlowDir, uShallow, uDeep, uFoam, uLandRadius, uPlaneSize },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_SHORE}
      ${GLSL_HASH_NOISE}
      uniform vec3 uShallow, uDeep, uFoam;
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;

      void main(){
        float shore = shoreDist(vWorld.xz);
        float depth = smoothstep(0.0, 9.0, shore);
        vec3 col = mix(uShallow, uDeep, depth);

        // Rotate into a flow-aligned basis, then stretch: low frequency
        // ALONG the current (long trailing streaks), higher frequency
        // ACROSS it (narrow), so foam reads as rapids/current lines.
        vec2 f = normalize(uFlowDir);
        vec2 cr = vec2(-f.y, f.x);
        vec2 basis = vec2(dot(vWorld.xz, f), dot(vWorld.xz, cr));
        vec2 st = vec2(basis.x * 0.12, basis.y * 0.9) - vec2(uTime * 1.1, 0.0);

        float n = fbm(st);
        float aa = fwidth(n) * 1.5 + 0.01;
        float streak = smoothstep(0.42 - aa, 0.42 + aa, n)
                     - smoothstep(0.68 - aa, 0.68 + aa, n) * 0.35;
        streak = clamp(streak, 0.0, 1.0);

        // Break rapids up mostly near the shore / land, calmer mid-channel.
        float turbulence = 1.0 - smoothstep(0.0, 7.0, shore);
        turbulence = clamp(turbulence + 0.08, 0.0, 1.0);
        streak *= turbulence;

        col = mix(col, uFoam, streak);
        float shoreFoam = (1.0 - smoothstep(0.0, 0.8, shore));
        col = mix(col, uFoam, shoreFoam * 0.7);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 4. Toon Banded River -- posterized, cel-shaded flat colour bands
// ---------------------------------------------------------------------------
function makeToonBands() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime,
      uFlowDir,
      uLandRadius,
      uPlaneSize,
      uBands: {
        value: [
          new THREE.Color(0x123a5e),
          new THREE.Color(0x1d5a86),
          new THREE.Color(0x3f8fb0),
          new THREE.Color(0xbfe9ef),
        ],
      },
      uFoam,
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float phase = dot(wp.xz, uFlowDir) * 0.7 - uTime * 1.2;
        wp.y += sin(phase) * 0.05;
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_SHORE}
      uniform vec3 uBands[4];
      uniform vec3 uFoam;
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;

      void main(){
        float shore = shoreDist(vWorld.xz);
        float field = smoothstep(0.0, 4.0, shore);

        // add a slow travelling ripple so the bands visibly animate
        float phase = dot(vWorld.xz, normalize(uFlowDir)) * 0.5 - uTime * 0.9;
        field += sin(phase) * 0.09;

        float bandF = clamp(field, 0.0, 0.999) * 4.0;
        int idx = int(floor(bandF));
        vec3 col = uBands[idx];

        // thin bright specular stripe sliding downstream (cel highlight)
        float stripe = sin(phase * 2.0 - uTime * 1.6);
        float highlight = smoothstep(0.965, 0.995, stripe);
        col = mix(col, vec3(1.0), highlight * 0.8);

        float shoreFoam = 1.0 - smoothstep(0.0, 0.5, shore);
        col = mix(col, uFoam, shoreFoam);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// 5. Cross-Chop Ripples -- two ripple fields crossing at an angle
// ---------------------------------------------------------------------------
function makeCrossChop() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime, uFlowDir, uShallow, uDeep, uFoam, uLandRadius, uPlaneSize },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uFlowDir;
      varying vec3 vWorld;
      varying float vNode;
      void main(){
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vec2 f = normalize(uFlowDir);
        vec2 diag = normalize(f + vec2(-f.y, f.x)); // ~45 degrees off current

        float p1 = dot(wp.xz, f) * 1.1 - uTime * 1.5;
        float p2 = dot(wp.xz, diag) * 1.6 + uTime * 0.9;
        float w1 = sin(p1);
        float w2 = sin(p2);

        wp.y += (w1 * 0.07 + w2 * 0.05);
        vNode = w1 * w2; // bright where crests intersect
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      ${GLSL_SHORE}
      uniform vec3 uShallow, uDeep, uFoam;
      varying vec3 vWorld;
      varying float vNode;
      void main(){
        float shore = shoreDist(vWorld.xz);
        float depth = smoothstep(0.0, 9.0, shore);
        vec3 col = mix(uShallow, uDeep, depth);

        float node = smoothstep(0.55, 0.95, vNode);
        col += node * 0.55;

        float shoreFoam = 1.0 - smoothstep(0.0, 1.0, shore);
        col = mix(col, uFoam, clamp(node * 0.6 + shoreFoam * 0.7, 0.0, 1.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// ---------------------------------------------------------------------------
// Assemble the gallery
// ---------------------------------------------------------------------------
const variants = [
  { name: 'Gentle Ripple Flow', desc: 'layered sines drifting downstream', make: makeRippleFlow },
  { name: 'Gerstner Current', desc: 'summed Gerstner waves, real peaked crests', make: makeGerstner },
  { name: 'Rapids Foam Streaks', desc: 'fbm noise stretched into long foam trails', make: makeRapidsFoam },
  { name: 'Toon Banded River', desc: 'posterized cel-shaded flat colour bands', make: makeToonBands },
  { name: 'Cross-Chop Ripples', desc: 'two ripple fields crossing at an angle', make: makeCrossChop },
];

const waterMesh = new THREE.Mesh(planeGeo(), variants[0].make());
waterMesh.position.y = WATER_LEVEL;
scene.add(waterMesh);

const materialCache = new Map();
function selectVariant(i) {
  const v = variants[i];
  if (!materialCache.has(i)) materialCache.set(i, v.make());
  waterMesh.material = materialCache.get(i);
  document.getElementById('variant-title').textContent = v.name;
  document.getElementById('variant-desc').textContent = v.desc;
  [...document.querySelectorAll('.variant-btn')].forEach((btn, bi) =>
    btn.classList.toggle('active', bi === i)
  );
}
materialCache.set(0, waterMesh.material);

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
