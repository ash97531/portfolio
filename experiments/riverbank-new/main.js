import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ---------------------------------------------------------------------------
// Riverbank — a flat bank split into sand (x < 0) and water (x > 0), meeting
// at the shoreline x = 0. Five self-contained wave/foam variants can be
// swapped live from the HUD.
// ---------------------------------------------------------------------------

const WATER_WIDTH = 26;
const WATER_DEPTH = 34;
const SAND_WIDTH = 15;

const canvas = document.createElement('canvas');
document.body.insertBefore(canvas, document.body.firstChild);
canvas.style.position = 'fixed';
canvas.style.inset = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.display = 'block';
canvas.style.zIndex = '0';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

// --- sky backdrop (flat vertical gradient, generated on a canvas) ---------
function makeSkyTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, '#8fd3e8');
  grad.addColorStop(0.55, '#cdeaf0');
  grad.addColorStop(1, '#eef6ea');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
scene.background = makeSkyTexture();

const camera = new THREE.PerspectiveCamera(48, 16 / 9, 0.1, 200);
camera.position.set(16, 28, 38);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(5, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI * 0.46;
controls.minDistance = 18;
controls.maxDistance = 60;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.25;

const resizeObserver = new ResizeObserver((entries) => {
  const { width, height } = entries[0].contentRect;
  if (width === 0 || height === 0) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
});
resizeObserver.observe(canvas);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sun = new THREE.DirectionalLight(0xfff3d6, 1.0);
sun.position.set(-6, 12, 8);
scene.add(sun);
const lightDir = sun.position.clone().normalize();

// ---------------------------------------------------------------------------
// Shared GLSL noise helpers
// ---------------------------------------------------------------------------
const NOISE_GLSL = `
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * valueNoise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return v;
  }
`;

// ---------------------------------------------------------------------------
// Flow-trail system — winding light streaks left by particles drifting along
// a per-variant flow field, accumulated into a fading ping-pong texture and
// sampled back into the water shader (the "flow map painting" technique).
// ---------------------------------------------------------------------------
function makeSpriteTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function hashJS(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function valueNoiseJS(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hashJS(xi, yi);
  const b = hashJS(xi + 1, yi);
  const c = hashJS(xi, yi + 1);
  const d = hashJS(xi + 1, yi + 1);
  const ux = xf * xf * (3 - 2 * xf);
  const uy = yf * yf * (3 - 2 * yf);
  return a + (b - a) * ux + (c - a) * uy * (1 - ux) + (d - b) * ux * uy;
}
function curlNoiseJS(x, y) {
  const eps = 0.06;
  const n1 = valueNoiseJS(x, y + eps);
  const n2 = valueNoiseJS(x, y - eps);
  const n3 = valueNoiseJS(x + eps, y);
  const n4 = valueNoiseJS(x - eps, y);
  return { x: (n1 - n2) / (2 * eps), z: -(n3 - n4) / (2 * eps) };
}
function makeCurlFlow({ speed, curlScale, curlStrength }) {
  return {
    wrap: true,
    velocity(x, z) {
      const c = curlNoiseJS(x * curlScale, z * curlScale);
      return { x: c.x * curlStrength * speed, z: c.z * curlStrength * speed };
    },
    spawn() {
      return { x: Math.random() * WATER_WIDTH, z: (Math.random() - 0.5) * WATER_DEPTH };
    },
  };
}

class TrailSystem {
  constructor(renderer, width, depth, texWidth, texHeight) {
    this.renderer = renderer;
    this.width = width;
    this.depth = depth;

    const rtOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
    this.rtA = new THREE.WebGLRenderTarget(texWidth, texHeight, rtOptions);
    this.rtB = new THREE.WebGLRenderTarget(texWidth, texHeight, rtOptions);

    this.worldCamera = new THREE.OrthographicCamera(0, width, depth / 2, -depth / 2, 0.1, 10);
    this.worldCamera.position.set(0, 0, 1);
    this.worldCamera.lookAt(0, 0, 0);

    this.fadeUniforms = { tPrev: { value: null }, uDecay: { value: 0.96 } };
    const fadeMaterial = new THREE.ShaderMaterial({
      uniforms: this.fadeUniforms,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tPrev;
        uniform float uDecay;
        varying vec2 vUv;
        void main() { gl_FragColor = texture2D(tPrev, vUv) * uDecay; }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.fadeScene = new THREE.Scene();
    this.fadeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fadeMaterial));
    this.fadeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const spriteTex = makeSpriteTexture();
    this.pointsMaterial = new THREE.PointsMaterial({
      size: 14,
      map: spriteTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
      color: new THREE.Color('#eafaf3'),
    });
    this.pointsGeo = new THREE.BufferGeometry();
    this.points = new THREE.Points(this.pointsGeo, this.pointsMaterial);
    this.pointsScene = new THREE.Scene();
    this.pointsScene.add(this.points);

    this.pointCount = 0;
    this.flow = null;
    this.texture = this.rtA.texture;
  }

  configure({ count, decay, size, color, flow }) {
    this.flow = flow;
    this.pointCount = count;
    this.fadeUniforms.uDecay.value = decay;
    this.pointsMaterial.size = size;
    this.pointsMaterial.color.set(color);

    this.positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const p = flow.spawn();
      this.positions[i * 3 + 0] = p.x;
      this.positions[i * 3 + 1] = p.z;
      this.positions[i * 3 + 2] = 0;
    }
    this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.pointsGeo.attributes.position.needsUpdate = true;

    const renderer = this.renderer;
    renderer.setRenderTarget(this.rtA);
    renderer.clear();
    renderer.setRenderTarget(this.rtB);
    renderer.clear();
    renderer.setRenderTarget(null);
    this.texture = this.rtA.texture;
  }

  update(dt) {
    if (!this.flow) return;
    const W = this.width;
    const D = this.depth;
    const step = Math.min(dt, 0.05);

    for (let i = 0; i < this.pointCount; i++) {
      let x = this.positions[i * 3 + 0];
      let z = this.positions[i * 3 + 1];
      const v = this.flow.velocity(x, z);
      x += v.x * step;
      z += v.z * step;

      if (this.flow.wrap) {
        if (x < 0) x += W;
        else if (x > W) x -= W;
        if (z < -D / 2) z += D;
        else if (z > D / 2) z -= D;
      } else if (this.flow.outOfBounds(x, z)) {
        const p = this.flow.spawn();
        x = p.x;
        z = p.z;
      }

      this.positions[i * 3 + 0] = x;
      this.positions[i * 3 + 1] = z;
    }
    this.pointsGeo.attributes.position.needsUpdate = true;

    const src = this.texture === this.rtA.texture ? this.rtA : this.rtB;
    const dst = src === this.rtA ? this.rtB : this.rtA;

    this.fadeUniforms.tPrev.value = src.texture;
    const renderer = this.renderer;
    renderer.setRenderTarget(dst);
    renderer.autoClear = true;
    renderer.render(this.fadeScene, this.fadeCamera);
    renderer.autoClear = false;
    renderer.render(this.pointsScene, this.worldCamera);
    renderer.autoClear = true;
    renderer.setRenderTarget(null);

    this.texture = dst.texture;
  }
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------
const waterGeo = new THREE.PlaneGeometry(WATER_WIDTH, WATER_DEPTH, 200, 140);
waterGeo.rotateX(-Math.PI / 2);
waterGeo.translate(WATER_WIDTH / 2, 0, 0);

const waterUniforms = {
  uTime: { value: 0 },
  uWaveDir: { value: [new THREE.Vector2(1, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 0)] },
  uWaveFreqAmp: { value: [new THREE.Vector2(0, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0)] },
  uWaveSpeedPhase: { value: [new THREE.Vector2(0, 0), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0)] },
  uMaxAmp: { value: 0.4 },
  uDeepColor: { value: new THREE.Color('#1c6e82') },
  uShallowColor: { value: new THREE.Color('#7fd6d6') },
  uFoamColor: { value: new THREE.Color('#f3fbfa') },
  uBandWeight: { value: 1.0 },
  uBandWidth: { value: 1.4 },
  uBandBreathAmp: { value: 0.3 },
  uBandBreathSpeed: { value: 0.5 },
  uLaceWeight: { value: 0.0 },
  uLaceScale: { value: 0.5 },
  uLaceSpeed: { value: 0.15 },
  uCrestWeight: { value: 0.0 },
  uCrestThreshold: { value: 0.72 },
  uLightDir: { value: lightDir },
  uHorizonColor: { value: new THREE.Color('#cdeaf0') },
  uTrailMap: { value: null },
  uTrailStrength: { value: 0.4 },
};

const waterMaterial = new THREE.ShaderMaterial({
  uniforms: waterUniforms,
  vertexShader: `
    uniform float uTime;
    uniform vec2 uWaveDir[3];
    uniform vec2 uWaveFreqAmp[3];
    uniform vec2 uWaveSpeedPhase[3];

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying float vHeight;

    void main() {
      vec3 pos = position;
      float h = 0.0;
      float dhdx = 0.0;
      float dhdz = 0.0;

      for (int i = 0; i < 3; i++) {
        float amp = uWaveFreqAmp[i].y;
        if (amp > 0.0001) {
          float k = uWaveFreqAmp[i].x;
          vec2 dir = uWaveDir[i];
          float phase = (pos.x * dir.x + pos.z * dir.y) * k + uTime * uWaveSpeedPhase[i].x + uWaveSpeedPhase[i].y;
          h += amp * sin(phase);
          float dcos = amp * k * cos(phase);
          dhdx += dcos * dir.x;
          dhdz += dcos * dir.y;
        }
      }

      pos.y += h;
      vHeight = h;
      vNormal = normalize(vec3(-dhdx, 1.0, -dhdz));

      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uFoamColor;
    uniform float uBandWeight;
    uniform float uBandWidth;
    uniform float uBandBreathAmp;
    uniform float uBandBreathSpeed;
    uniform float uLaceWeight;
    uniform float uLaceScale;
    uniform float uLaceSpeed;
    uniform float uCrestWeight;
    uniform float uCrestThreshold;
    uniform float uMaxAmp;
    uniform vec3 uLightDir;
    uniform vec3 uHorizonColor;
    uniform sampler2D uTrailMap;
    uniform float uTrailStrength;

    varying vec3 vNormal;
    varying vec3 vWorldPos;
    varying float vHeight;

    ${NOISE_GLSL}

    void main() {
      vec3 normal = normalize(vNormal);
      float x = vWorldPos.x;
      float z = vWorldPos.z;

      float effWidth = max(0.05, uBandWidth + sin(uTime * uBandBreathSpeed - z * 0.12) * uBandBreathAmp);
      float bandTerm = 1.0 - smoothstep(0.0, effWidth, x);

      float laceN = fbm(vec2(x * uLaceScale - uTime * uLaceSpeed, z * uLaceScale + uTime * 0.05));
      float laceEdge = 1.0 - smoothstep(0.0, uBandWidth * 1.8, x);
      float laceTerm = smoothstep(0.5, 0.85, laceN) * laceEdge;

      float hNorm = clamp(vHeight / max(uMaxAmp, 0.0001) * 0.5 + 0.5, 0.0, 1.0);
      float crestTerm = smoothstep(uCrestThreshold, uCrestThreshold + 0.05, hNorm);

      float foam = clamp(
        bandTerm * uBandWeight + laceTerm * uLaceWeight + crestTerm * uCrestWeight,
        0.0, 1.0
      );

      float shallow = 1.0 - smoothstep(0.0, 14.0, x);
      vec3 base = mix(uDeepColor, uShallowColor, shallow);

      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      vec3 ld = normalize(uLightDir);
      float diffuse = max(dot(normal, ld), 0.0);
      base *= (0.55 + 0.45 * diffuse);

      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      base += fresnel * 0.08;

      vec3 color = mix(base, uFoamColor, foam);

      float spec = pow(max(dot(reflect(-ld, normal), viewDir), 0.0), 60.0);
      color += spec * 0.18;

      vec2 trailUv = vec2(x / ${WATER_WIDTH.toFixed(1)}, (z + ${(WATER_DEPTH / 2).toFixed(1)}) / ${WATER_DEPTH.toFixed(1)});
      vec3 trailSample = texture2D(uTrailMap, trailUv).rgb;
      color += trailSample * uTrailStrength * (1.0 - foam * 0.6);

      float edgeFadeX = smoothstep(${(WATER_WIDTH * 0.72).toFixed(1)}, ${WATER_WIDTH.toFixed(1)}, x);
      float edgeFadeZ = smoothstep(${(WATER_DEPTH * 0.42).toFixed(1)}, ${(WATER_DEPTH * 0.5).toFixed(1)}, abs(z));
      float horizonFade = clamp(max(edgeFadeX, edgeFadeZ), 0.0, 1.0);
      color = mix(color, uHorizonColor, horizonFade);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

const water = new THREE.Mesh(waterGeo, waterMaterial);
scene.add(water);

// ---------------------------------------------------------------------------
// Sand
// ---------------------------------------------------------------------------
const sandGeo = new THREE.PlaneGeometry(SAND_WIDTH, WATER_DEPTH, 80, 60);
sandGeo.rotateX(-Math.PI / 2);
sandGeo.translate(-SAND_WIDTH / 2, 0, 0);

const sandUniforms = {
  uTime: { value: 0 },
  uBandWidth: { value: waterUniforms.uBandWidth.value },
  uBandBreathAmp: { value: waterUniforms.uBandBreathAmp.value },
  uBandBreathSpeed: { value: waterUniforms.uBandBreathSpeed.value },
  uDryColor: { value: new THREE.Color('#e7cf9e') },
  uWetColor: { value: new THREE.Color('#b3925c') },
  uFoamColor: { value: new THREE.Color('#f3fbfa') },
  uLightDir: { value: lightDir },
  uHorizonColor: { value: new THREE.Color('#e2ddc4') },
};

const sandMaterial = new THREE.ShaderMaterial({
  uniforms: sandUniforms,
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPos;

    void main() {
      vec3 pos = position;
      float h = 0.06 * sin(pos.x * 0.35 + 1.0) * cos(pos.z * 0.28);
      float dhdx = 0.06 * 0.35 * cos(pos.x * 0.35 + 1.0) * cos(pos.z * 0.28);
      float dhdz = -0.06 * sin(pos.x * 0.35 + 1.0) * 0.28 * sin(pos.z * 0.28);
      pos.y += h;
      vNormal = normalize(vec3(-dhdx, 1.0, -dhdz));
      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uBandWidth;
    uniform float uBandBreathAmp;
    uniform float uBandBreathSpeed;
    uniform vec3 uDryColor;
    uniform vec3 uWetColor;
    uniform vec3 uFoamColor;
    uniform vec3 uLightDir;
    uniform vec3 uHorizonColor;

    varying vec3 vNormal;
    varying vec3 vWorldPos;

    ${NOISE_GLSL}

    void main() {
      float dist = -vWorldPos.x;
      float z = vWorldPos.z;
      float effWidth = max(0.05, uBandWidth * 0.65 + sin(uTime * uBandBreathSpeed - z * 0.12) * uBandBreathAmp * 0.65);
      float wetTerm = 1.0 - smoothstep(0.0, effWidth, dist);

      float grain = fbm(vWorldPos.xz * 0.6);
      vec3 dry = mix(uDryColor * 0.9, uDryColor * 1.08, grain);

      vec3 color = mix(dry, uWetColor, wetTerm);

      float fleck = smoothstep(0.72, 0.95, fbm(vWorldPos.xz * 1.8 + uTime * 0.1)) * wetTerm * 0.5;
      color = mix(color, uFoamColor, fleck);

      vec3 normal = normalize(vNormal);
      float diffuse = max(dot(normal, normalize(uLightDir)), 0.0);
      color *= (0.6 + 0.4 * diffuse);

      float edgeFadeX = 1.0 - smoothstep(${(-SAND_WIDTH).toFixed(1)}, ${(-SAND_WIDTH * 0.72).toFixed(1)}, vWorldPos.x);
      float edgeFadeZ = smoothstep(${(WATER_DEPTH * 0.42).toFixed(1)}, ${(WATER_DEPTH * 0.5).toFixed(1)}, abs(vWorldPos.z));
      float horizonFade = clamp(max(edgeFadeX, edgeFadeZ), 0.0, 1.0);
      color = mix(color, uHorizonColor, horizonFade);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
});

const sand = new THREE.Mesh(sandGeo, sandMaterial);
scene.add(sand);

const trailSystem = new TrailSystem(renderer, WATER_WIDTH, WATER_DEPTH, 512, Math.round(512 * (WATER_DEPTH / WATER_WIDTH)));

// ---------------------------------------------------------------------------
// Foam Lace — fine layered ripples fringing the shore with a lacy foam edge
// ---------------------------------------------------------------------------
const foamLace = {
  waves: [
    { dir: [-1, 0.05], freq: 2.4, amp: 0.045, speed: 0.7, phase: 0 },
    { dir: [-1, -0.2], freq: 3.1, amp: 0.03, speed: 0.9, phase: 2.2 },
    { dir: [-1, 0], freq: 0.9, amp: 0.05, speed: 0.4, phase: 1.1 },
  ],
  foam: { bandWeight: 0.35, bandWidth: 0.9, breathAmp: 0.2, breathSpeed: 0.6, lace: 1, laceScale: 0.9, laceSpeed: 0.2, crest: 0.2, crestThreshold: 0.85 },
  trail: {
    count: 90, decay: 0.955, size: 10, color: '#ffffff', strength: 0.5,
    flow: makeCurlFlow({ speed: 1.3, curlScale: 0.16, curlStrength: 1.4 }),
  },
};

for (let i = 0; i < 3; i++) {
  const w = foamLace.waves[i];
  waterUniforms.uWaveDir.value[i].set(w.dir[0], w.dir[1]).normalize();
  waterUniforms.uWaveFreqAmp.value[i].set(w.freq, w.amp);
  waterUniforms.uWaveSpeedPhase.value[i].set(w.speed, w.phase);
}
waterUniforms.uMaxAmp.value = foamLace.waves.reduce((sum, w) => sum + w.amp, 0.05);

const f = foamLace.foam;
waterUniforms.uBandWeight.value = f.bandWeight;
waterUniforms.uBandWidth.value = f.bandWidth;
waterUniforms.uBandBreathAmp.value = f.breathAmp;
waterUniforms.uBandBreathSpeed.value = f.breathSpeed;
waterUniforms.uLaceWeight.value = f.lace;
waterUniforms.uLaceScale.value = f.laceScale;
waterUniforms.uLaceSpeed.value = f.laceSpeed;
waterUniforms.uCrestWeight.value = f.crest;
waterUniforms.uCrestThreshold.value = f.crestThreshold;

sandUniforms.uBandWidth.value = f.bandWidth;
sandUniforms.uBandBreathAmp.value = f.breathAmp;
sandUniforms.uBandBreathSpeed.value = f.breathSpeed;

trailSystem.configure(foamLace.trail);
waterUniforms.uTrailStrength.value = foamLace.trail.strength;
waterUniforms.uTrailMap.value = trailSystem.texture;

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  elapsed += dt;
  waterUniforms.uTime.value = elapsed;
  sandUniforms.uTime.value = elapsed;

  trailSystem.update(dt);
  waterUniforms.uTrailMap.value = trailSystem.texture;

  controls.update();
  renderer.render(scene, camera);
}
animate();
