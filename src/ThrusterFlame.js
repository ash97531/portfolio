import * as THREE from 'three';

// Particle-based thruster flame: a loose plume of soft blue-to-yellow
// sparks beneath the UFO (like an LPG gas flame), gently alive at idle and
// bursting outward on a jump "boost". Owns its own THREE.Points mesh -
// attach `.points` as a child of whatever it should follow.
const PARTICLE_COUNT = 64;
const ATTACH_Z = -0.34; // local z on the UFO mesh: clears the saucer's rim
const REACH = 1.05; // how far particles travel before recycling
const SPREAD = 0.38; // max horizontal drift
const WIGGLE_SPEED = 5.5;
const BASE_SIZE = 0.55;
const POINT_SIZE_SCALE = 1700; // tunes on-screen pixel size vs camera distance
const BASE_ALPHA = 0.95;
const BOOST_DECAY = 3.2; // per-second decay back to idle
const BOOST_REACH_MULT = 1.7;
const BOOST_SPREAD_MULT = 1.5;
const BOOST_SIZE_MULT = 1.6;
const DT = 1 / 60; // matches the fixed physics timestep

// Flame color gradient stops: blue base -> pale core -> yellow tip, like an
// LPG burner. A straight blue->yellow lerp passes through a muddy green, so
// this goes through a pale cyan-white stop instead.
const GRADIENT = [
  { t: 0, color: new THREE.Color(0x1a4dff) },
  { t: 0.35, color: new THREE.Color(0x8fe0ff) },
  { t: 0.7, color: new THREE.Color(0xfff3b0) },
  { t: 1, color: new THREE.Color(0xffb020) },
];

function sampleGradient(t, out) {
  for (let i = 1; i < GRADIENT.length; i++) {
    if (t <= GRADIENT[i].t || i === GRADIENT.length - 1) {
      const a = GRADIENT[i - 1];
      const b = GRADIENT[i];
      const localT = (t - a.t) / (b.t - a.t || 1);
      out.copy(a.color).lerp(b.color, Math.max(0, Math.min(1, localT)));
      return;
    }
  }
}

const VERTEX_SHADER = `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (${POINT_SIZE_SCALE.toFixed(1)} / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    float alpha = smoothstep(0.5, 0.15, d) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

class ThrusterFlame {
  points;
  boost = 0;

  _ages = new Float32Array(PARTICLE_COUNT);
  _lifetimes = new Float32Array(PARTICLE_COUNT);
  _speeds = new Float32Array(PARTICLE_COUNT);
  _spreads = new Float32Array(PARTICLE_COUNT);
  _seedsX = new Float32Array(PARTICLE_COUNT);
  _seedsY = new Float32Array(PARTICLE_COUNT);
  _time = 0;
  _tmpColor = new THREE.Color();

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3),
    );
    geometry.setAttribute(
      'aColor',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3),
    );
    geometry.setAttribute(
      'aSize',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT), 1),
    );
    geometry.setAttribute(
      'aAlpha',
      new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT), 1),
    );

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this._respawn(i, true);
    }

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.position.z = ATTACH_Z;
    this.points.frustumCulled = false; // small local mesh; avoid pop-out at screen edges

    this.update();
  }

  _respawn(i, initial) {
    this._lifetimes[i] = 0.5 + Math.random() * 0.4;
    this._ages[i] = initial ? Math.random() * this._lifetimes[i] : 0;
    this._speeds[i] = 0.75 + Math.random() * 0.5;
    this._spreads[i] = 0.6 + Math.random() * 0.8;
    this._seedsX[i] = Math.random() * Math.PI * 2;
    this._seedsY[i] = Math.random() * Math.PI * 2;
  }

  // Called on jump: a brief burst - particles fly further, wider, and bigger.
  triggerBoost() {
    this.boost = 1;
  }

  update() {
    this._time += DT;
    this.boost = Math.max(0, this.boost - BOOST_DECAY * DT);

    const reach = REACH * (1 + this.boost * (BOOST_REACH_MULT - 1));
    const spread = SPREAD * (1 + this.boost * (BOOST_SPREAD_MULT - 1));
    const sizeMult = 1 + this.boost * (BOOST_SIZE_MULT - 1);

    const { position, aColor, aSize, aAlpha } = this.points.geometry.attributes;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this._ages[i] += DT;
      if (this._ages[i] >= this._lifetimes[i]) this._respawn(i, false);

      const t = this._ages[i] / this._lifetimes[i];
      const envelope = Math.sin(Math.PI * Math.min(1, t));

      const z = -t * reach * this._speeds[i];
      const wobble = spread * this._spreads[i] * t;
      const x = Math.sin(this._time * WIGGLE_SPEED + this._seedsX[i]) * wobble;
      const y =
        Math.cos(this._time * WIGGLE_SPEED * 0.8 + this._seedsY[i]) * wobble;

      position.setXYZ(i, x, y, z);

      sampleGradient(t, this._tmpColor);
      aColor.setXYZ(i, this._tmpColor.r, this._tmpColor.g, this._tmpColor.b);

      aSize.setX(i, BASE_SIZE * sizeMult * envelope);
      aAlpha.setX(i, BASE_ALPHA * envelope);
    }

    position.needsUpdate = true;
    aColor.needsUpdate = true;
    aSize.needsUpdate = true;
    aAlpha.needsUpdate = true;
  }
}

export default ThrusterFlame;
