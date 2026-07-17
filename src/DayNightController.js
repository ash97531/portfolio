import * as THREE from 'three';
import TWEEN from 'three/examples/jsm/libs/tween.module.js';

// Global day/evening atmosphere: crossfades the scene's lights, ground tint,
// sky gradient, and fog, and fades in a starfield / firefly swarm / moon.
// Everything reactive to time-of-day drives off a single tweened `state`
// object so switching is one smooth ~1.2s transition instead of a hard cut.
// Coordinate note: this scene is Z-up (gravity is -z), so "sky" runs along z.

const STORAGE_KEY = 'portfolio-daynight';

const DAY_RAW = {
  hemiSkyColor: 0xffffbb,
  hemiGroundColor: 0x080820,
  hemiIntensity: 1,
  dirColor: 0xffffff,
  dirIntensity: 1.8,
  dir2Color: 0xffffff,
  dir2Intensity: 1.3,
  groundColor: 0x70ac29,
  fogColor: 0xcfe9ff,
  fogNear: 220,
  fogFar: 520,
  skyTopColor: 0x3a8ee0,
  skyBottomColor: 0xdff3ff,
  nightFactor: 0,
};

// "Evening" rather than pitch-black midnight: a warm dusk horizon fading up
// into a cooler indigo sky, with enough hemisphere/directional light left to
// still read the scene clearly.
const NIGHT_RAW = {
  hemiSkyColor: 0x7688b8,
  hemiGroundColor: 0x232338,
  hemiIntensity: 1.1,
  dirColor: 0xffc493,
  dirIntensity: 0.95,
  dir2Color: 0x7f92cc,
  dir2Intensity: 0.6,
  groundColor: 0x44714a,
  fogColor: 0x4c5182,
  fogNear: 160,
  fogFar: 520,
  skyTopColor: 0x33437e,
  skyBottomColor: 0xe08f5e,
  nightFactor: 1,
};

function flatten(raw) {
  const out = {};
  for (const key of Object.keys(raw)) {
    if (key.endsWith('Color')) {
      const c = new THREE.Color(raw[key]);
      out[key + 'R'] = c.r;
      out[key + 'G'] = c.g;
      out[key + 'B'] = c.b;
    } else {
      out[key] = raw[key];
    }
  }
  return out;
}

const DAY = flatten(DAY_RAW);
const NIGHT = flatten(NIGHT_RAW);

const STAR_COUNT = 500;
const STAR_SHELL_RADIUS = 480;
const FIREFLY_COUNT = 55;
// roughly covers the populated play area (mountains/panels sit within
// dx/dy offsets of about +/-70 in content.js)
const FIREFLY_BOUNDS = { x: 80, yMin: -35, yMax: 25, zMin: 0.4, zMax: 3.2 };

const STAR_VERTEX = `
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  varying float vTwinkle;
  void main() {
    vTwinkle = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(2.2 * (300.0 / -mvPosition.z), 6.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const STAR_FRAGMENT = `
  uniform float uNightFactor;
  varying float vTwinkle;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d) * (0.35 + 0.65 * vTwinkle) * uNightFactor;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(0.85, 0.92, 1.0, alpha);
  }
`;

const FIREFLY_VERTEX = `
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aAmp;
  uniform float uTime;
  varying float vFlicker;
  void main() {
    vec3 pos = position;
    pos.z += sin(uTime * aSpeed + aPhase) * aAmp;
    pos.x += cos(uTime * aSpeed * 0.6 + aPhase) * aAmp * 0.5;
    pos.y += sin(uTime * aSpeed * 0.5 + aPhase * 1.7) * aAmp * 0.5;
    vFlicker = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * aSpeed * 1.8 + aPhase * 1.3));
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = min(7.0 * (300.0 / -mvPosition.z), 24.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FIREFLY_FRAGMENT = `
  uniform float uNightFactor;
  varying float vFlicker;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.0, d) * vFlicker * uNightFactor;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(0.85, 1.0, 0.55, alpha);
  }
`;

const SKY_VERTEX = `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  varying vec3 vPos;
  void main() {
    float h = clamp(normalize(vPos).z * 0.5 + 0.5, 0.0, 1.0);
    gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.6)), 1.0);
  }
`;

class DayNightController {
  isNight = false;
  _time = 0;
  _state = { ...DAY };
  _nightFactorListeners = [];

  constructor(scene, hemiLight, dirLight, dirLight2, groundMesh) {
    this.scene = scene;
    this.hemi = hemiLight;
    this.dir = dirLight;
    this.dir2 = dirLight2;
    this.groundMat = groundMesh.material;

    this.scene.fog = new THREE.Fog(DAY_RAW.fogColor, DAY.fogNear, DAY.fogFar);

    this._buildSky();
    this._buildStars();
    this._buildFireflies();
    this._buildMoon();

    this._applyState(DAY);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'night') this.toggle(true, true);
  }

  _buildSky() {
    const geo = new THREE.SphereGeometry(STAR_SHELL_RADIUS + 20, 32, 16);
    const mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      uniforms: {
        topColor: { value: new THREE.Color(DAY_RAW.skyTopColor) },
        bottomColor: { value: new THREE.Color(DAY_RAW.skyBottomColor) },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyMesh = new THREE.Mesh(geo, mat);
    this.skyMesh.renderOrder = -1;
    this.scene.add(this.skyMesh);
  }

  _buildStars() {
    const positions = new Float32Array(STAR_COUNT * 3);
    const phases = new Float32Array(STAR_COUNT);
    const speeds = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      // random point on the upper hemisphere shell (z is "up" here)
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(v); // v in [0,1] -> phi in [0, pi/2] biased up
      const r = STAR_SHELL_RADIUS;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uNightFactor: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      fog: false,
    });

    this.stars = new THREE.Points(geo, mat);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  _buildFireflies() {
    const positions = new Float32Array(FIREFLY_COUNT * 3);
    const phases = new Float32Array(FIREFLY_COUNT);
    const speeds = new Float32Array(FIREFLY_COUNT);
    const amps = new Float32Array(FIREFLY_COUNT);

    for (let i = 0; i < FIREFLY_COUNT; i++) {
      positions[i * 3] = (Math.random() * 2 - 1) * FIREFLY_BOUNDS.x;
      positions[i * 3 + 1] =
        FIREFLY_BOUNDS.yMin +
        Math.random() * (FIREFLY_BOUNDS.yMax - FIREFLY_BOUNDS.yMin);
      positions[i * 3 + 2] =
        FIREFLY_BOUNDS.zMin +
        Math.random() * (FIREFLY_BOUNDS.zMax - FIREFLY_BOUNDS.zMin);
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.3 + Math.random() * 0.6;
      amps[i] = 0.3 + Math.random() * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    geo.setAttribute('aSpeed', new THREE.BufferAttribute(speeds, 1));
    geo.setAttribute('aAmp', new THREE.BufferAttribute(amps, 1));

    const mat = new THREE.ShaderMaterial({
      vertexShader: FIREFLY_VERTEX,
      fragmentShader: FIREFLY_FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uNightFactor: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    this.fireflies = new THREE.Points(geo, mat);
    this.fireflies.frustumCulled = false;
    this.scene.add(this.fireflies);
  }

  _buildMoon() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, 'rgba(255,250,230,1)');
    grad.addColorStop(0.4, 'rgba(255,250,230,0.9)');
    grad.addColorStop(1, 'rgba(255,250,230,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    this.moon = new THREE.Sprite(mat);
    this.moon.scale.set(90, 90, 1);
    this.moon.position.set(-120, 60, 260);
    this.scene.add(this.moon);
  }

  _applyState(s) {
    this.hemi.color.setRGB(s.hemiSkyColorR, s.hemiSkyColorG, s.hemiSkyColorB);
    this.hemi.groundColor.setRGB(
      s.hemiGroundColorR,
      s.hemiGroundColorG,
      s.hemiGroundColorB,
    );
    this.hemi.intensity = s.hemiIntensity;

    this.dir.color.setRGB(s.dirColorR, s.dirColorG, s.dirColorB);
    this.dir.intensity = s.dirIntensity;

    this.dir2.color.setRGB(s.dir2ColorR, s.dir2ColorG, s.dir2ColorB);
    this.dir2.intensity = s.dir2Intensity;

    this.groundMat.color.setRGB(
      s.groundColorR,
      s.groundColorG,
      s.groundColorB,
    );

    this.scene.fog.color.setRGB(s.fogColorR, s.fogColorG, s.fogColorB);
    this.scene.fog.near = s.fogNear;
    this.scene.fog.far = s.fogFar;

    this.skyMesh.material.uniforms.topColor.value.setRGB(
      s.skyTopColorR,
      s.skyTopColorG,
      s.skyTopColorB,
    );
    this.skyMesh.material.uniforms.bottomColor.value.setRGB(
      s.skyBottomColorR,
      s.skyBottomColorG,
      s.skyBottomColorB,
    );

    this.stars.material.uniforms.uNightFactor.value = s.nightFactor;
    this.fireflies.material.uniforms.uNightFactor.value = s.nightFactor;
    this.moon.material.opacity = s.nightFactor;

    for (const fn of this._nightFactorListeners) fn(s.nightFactor);
  }

  // Registers a callback invoked with the current nightFactor (0..1)
  // whenever it changes, and immediately once with the current value.
  onNightFactorChange(fn) {
    this._nightFactorListeners.push(fn);
    fn(this._state.nightFactor);
  }

  // `instant` skips the tween (used to restore a saved preference on load).
  toggle(forceNight, instant = false) {
    const goingNight = forceNight !== undefined ? forceNight : !this.isNight;
    this.isNight = goingNight;
    localStorage.setItem(STORAGE_KEY, goingNight ? 'night' : 'day');

    const target = goingNight ? NIGHT : DAY;

    if (instant) {
      this._state = { ...target };
      this._applyState(this._state);
      return;
    }

    new TWEEN.Tween(this._state)
      .to(target, 1400)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => this._applyState(this._state))
      .start();
  }

  update(dt) {
    this._time += dt;
    this.stars.material.uniforms.uTime.value = this._time;
    this.fireflies.material.uniforms.uTime.value = this._time;
  }
}

export default DayNightController;
