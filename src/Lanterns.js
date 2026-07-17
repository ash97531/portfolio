import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import InstancedMeshGroup from './InstancedMeshGroup';

// Lanterns: one strand precisely aligned along the pavement path, plus a few
// standalone rings of lanterns bunched around notable landmarks (the
// skills/achievements board, the contact-links signpost). Each lantern is a
// pole + a glowing warm globe; neighbors within a strand/ring are strung
// together with a sagging hanging wire. Glow strength is driven by
// DayNightController's nightFactor (dim by day, warm at dusk/night).
//
// Perf note: this used to give every lantern its own THREE.PointLight - with
// ~40 lanterns that's 40 extra real-time lights, and three.js prices every
// light into the fragment shader of every lit material in the scene, which
// tanked the frame rate. Nothing here casts real light anymore; the glow is
// faked with emissive material + an additive glow sprite layer, so the
// lantern count no longer affects lighting cost at all - only a handful of
// draw calls total (instanced poles, instanced globes, one glow-sprite
// batch, one merged wire mesh) regardless of how many lanterns there are.

const POLE_HEIGHT = 1.7;
const POLE_RADIUS = 0.045;
const GLOW_RADIUS = 0.16;
const MIN_SPACING = 4.5; // distance walked along the path before placing the next lantern
const MAX_WIRE_SPAN = 6.5; // don't string a wire across a gap this large (separate path segments)
const WIRE_SAG = 0.55;
const IDLE_GLOW = 0.08; // faint even in daylight, like an unlit glass globe

// Standalone rings of lanterns around landmarks that aren't on the pavement
// path (world coordinates - see placeAchievement.js / placeContactLinks.js
// for how these areas are laid out).
const EXTRA_CLUSTERS = [
  { center: { x: -1.5, y: -27, z: 0 }, count: 7, radius: 7.5 }, // skills & achievements board
  { center: { x: 20, y: -8, z: 0 }, count: 6, radius: 5.5 }, // gmail/github/linkedin/playstore signpost
];

const GLOW_SPRITE_VERTEX = `
  uniform float uSize;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(uSize * (300.0 / -mvPosition.z), 60.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const GLOW_SPRITE_FRAGMENT = `
  uniform float uNightFactor;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv) * 2.0;
    float alpha = smoothstep(1.0, 0.0, d) * uNightFactor;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(1.0, 0.75, 0.4, alpha * 0.55);
  }
`;

class Lanterns {
  _glowMat;
  _glowSpriteMat;
  _nightFactor = 0;

  constructor(scene, pavementPositions) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);

    const pathLanterns = this._pickPathSpots(pavementPositions);
    const wireChains = [{ lanterns: pathLanterns, closed: false }];

    for (const cluster of EXTRA_CLUSTERS) {
      wireChains.push({ lanterns: this._ringSpots(cluster), closed: true });
    }

    const allLanterns = wireChains.flatMap((chain) => chain.lanterns);
    const allTops = allLanterns.map((l) => new THREE.Vector3(l.x, l.y, l.topZ));

    this._buildPoles(allLanterns);
    this._buildGlobes(allLanterns, allTops);
    this._buildGlowSprites(allTops);
    for (const chain of wireChains) {
      this._buildWires(
        chain.lanterns.map((l) => new THREE.Vector3(l.x, l.y, l.topZ)),
        chain.closed,
      );
    }
    this.setNightFactor(0);
  }

  // Walks the pavement tiles in placement order and drops a lantern every
  // MIN_SPACING units, right on the path (z is up).
  _pickPathSpots(positions) {
    const lanterns = [];
    let last = null;
    for (const p of positions) {
      if (last && last.distanceTo(p) < MIN_SPACING) continue;
      lanterns.push({
        x: p.x,
        y: p.y,
        z: p.z,
        heightScale: 1,
        topZ: p.z + POLE_HEIGHT,
        rz: 0,
      });
      last = p;
    }
    return lanterns;
  }

  // A loose ring of lanterns scattered around a landmark, for a "bunch of
  // lanterns outside X" look rather than a precise strand.
  _ringSpots({ center, count, radius }) {
    const lanterns = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const r = radius * (0.85 + Math.random() * 0.3);
      const x = center.x + Math.cos(angle) * r;
      const y = center.y + Math.sin(angle) * r;
      const heightScale = 1 + (Math.random() * 2 - 1) * 0.1;
      lanterns.push({
        x,
        y,
        z: center.z,
        heightScale,
        topZ: center.z + POLE_HEIGHT * heightScale,
        rz: Math.random() * Math.PI * 2,
      });
    }
    return lanterns;
  }

  _buildPoles(lanterns) {
    const poleGeo = new THREE.CylinderGeometry(
      POLE_RADIUS,
      POLE_RADIUS * 1.3,
      POLE_HEIGHT,
      6,
    );
    // cylinders default to a Y-aligned height axis; this scene is Z-up, so
    // without this the poles would render lying flat on their sides.
    poleGeo.rotateX(Math.PI / 2);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x2b2b2b,
      roughness: 0.6,
      metalness: 0.4,
    });
    const poles = new InstancedMeshGroup(
      new THREE.Mesh(poleGeo, poleMat),
      lanterns.length,
    );
    poles.mesh.castShadow = true;
    this.group.add(poles.mesh);

    for (const l of lanterns) {
      const scale = new THREE.Vector3(1, 1, l.heightScale);
      poles.addStatic(
        l.x,
        l.y,
        l.z + (POLE_HEIGHT * l.heightScale) / 2,
        scale,
        l.rz,
      );
    }
  }

  // Small solid emissive globe for close-up detail (cheap: shares one
  // material, so setNightFactor only ever touches a single uniform-like prop).
  _buildGlobes(lanterns, tops) {
    this._glowMat = new THREE.MeshStandardMaterial({
      color: 0xffd9a0,
      emissive: 0xffb35c,
      emissiveIntensity: IDLE_GLOW,
      roughness: 0.35,
    });
    const globes = new InstancedMeshGroup(
      new THREE.Mesh(new THREE.IcosahedronGeometry(GLOW_RADIUS, 1), this._glowMat),
      tops.length,
    );
    this.group.add(globes.mesh);

    tops.forEach((top, i) => {
      globes.addStatic(top.x, top.y, top.z, new THREE.Vector3(1, 1, 1), lanterns[i].rz);
    });
  }

  // Soft additive halo around every lantern, all in one draw call - reads as
  // a warm glow without adding any real lights to the scene.
  _buildGlowSprites(tops) {
    const positions = new Float32Array(tops.length * 3);
    tops.forEach((top, i) => {
      positions[i * 3] = top.x;
      positions[i * 3 + 1] = top.y;
      positions[i * 3 + 2] = top.z;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this._glowSpriteMat = new THREE.ShaderMaterial({
      vertexShader: GLOW_SPRITE_VERTEX,
      fragmentShader: GLOW_SPRITE_FRAGMENT,
      uniforms: {
        uSize: { value: 14 },
        uNightFactor: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });

    const points = new THREE.Points(geo, this._glowSpriteMat);
    points.frustumCulled = false;
    this.group.add(points);
  }

  // Strings a sagging wire (a tube on a curved path) between consecutive
  // lantern tops in a chain, optionally closing the loop back to the first.
  // Segments across a single chain are merged into one mesh.
  _buildWires(tops, closed) {
    if (tops.length < 2) return;
    const segments = [];
    const pairCount = closed ? tops.length : tops.length - 1;
    for (let i = 0; i < pairCount; i++) {
      const a = tops[i];
      const b = tops[(i + 1) % tops.length];
      if (a.distanceTo(b) > MAX_WIRE_SPAN) continue;

      const mid = a.clone().lerp(b, 0.5);
      mid.z -= WIRE_SAG;
      const curve = new THREE.CatmullRomCurve3([a, mid, b]);
      segments.push(new THREE.TubeGeometry(curve, 10, 0.018, 5, false));
    }
    if (segments.length === 0) return;

    const merged = mergeGeometries(segments);
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.1,
    });
    const wires = new THREE.Mesh(merged, wireMat);
    this.group.add(wires);
  }

  setNightFactor(f) {
    this._nightFactor = f;
    this._glowMat.emissiveIntensity = IDLE_GLOW + f * (1 - IDLE_GLOW);
    this._glowSpriteMat.uniforms.uNightFactor.value = f;
  }
}

export default Lanterns;
