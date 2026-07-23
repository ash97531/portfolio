import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/*
 * Little island experiment.
 *   - a rounded sandy island with grassy top
 *   - water all around, with waves rolling inward toward the island
 *   - grass blades that weave along the wind
 *   - a small tree as the island's centrepiece
 * Everything is procedural (no external assets) and driven by a couple of
 * lightweight GLSL shaders.
 */

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd6e8);
scene.fog = new THREE.Fog(0x9fd6e8, 45, 110);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(18, 12, 22);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 8;
controls.maxDistance = 70;
controls.maxPolarAngle = Math.PI * 0.49; // stay above the water
controls.target.set(0, 1.5, 0);

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const hemi = new THREE.HemisphereLight(0xcfefff, 0x3a6b4a, 0.9);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d6, 2.1);
sun.position.set(24, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 22;
sun.shadow.camera.bottom = -22;
sun.shadow.bias = -0.0004;
scene.add(sun);

// A soft sky dome so the horizon reads as sky rather than flat fog.
{
  const skyGeo = new THREE.SphereGeometry(220, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x4a97d1) },
      bottomColor: { value: new THREE.Color(0xbfe6f2) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = clamp(normalize(vWorld).y * 1.4 + 0.2, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
}

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------
const WATER_LEVEL = 0.0;
const ISLAND_RADIUS = 9.0; // radius at the waterline
const clock = new THREE.Clock();

// Smooth radial height profile for the island: a rounded dome that dips
// below the waterline at the edges plus a little low-frequency noise so the
// coastline isn't a perfect circle.
function hash(x, z) {
  return Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
}
function noise2(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = Math.sin(hash(xi, zi)) * 0.5 + 0.5;
  const b = Math.sin(hash(xi + 1, zi)) * 0.5 + 0.5;
  const c = Math.sin(hash(xi, zi + 1)) * 0.5 + 0.5;
  const d = Math.sin(hash(xi + 1, zi + 1)) * 0.5 + 0.5;
  return (
    a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v
  );
}

function islandHeight(x, z) {
  const r = Math.sqrt(x * x + z * z);
  // Base dome: high in the middle, falls off toward ISLAND_RADIUS.
  const t = THREE.MathUtils.clamp(r / (ISLAND_RADIUS + 1.5), 0, 1);
  const dome = Math.cos(t * Math.PI * 0.5); // 1 at centre -> 0 at edge
  let h = dome * dome * 3.6 - 1.0; // lift, then sink edges under water
  // Gentle rolling variation on the grassy top.
  h += (noise2(x * 0.28, z * 0.28) - 0.5) * 1.4 * Math.max(0, dome);
  // Beyond the shoreline the seabed drops away steeply so the submerged part
  // reads as deep water rather than a flat shelf catching the light.
  if (r > ISLAND_RADIUS) {
    const d = r - ISLAND_RADIUS;
    h -= d * d * 0.18;
  }
  return h;
}

// ---------------------------------------------------------------------------
// Island mesh (sand + grass colouring baked into vertex colors)
// ---------------------------------------------------------------------------
function buildIsland() {
  const size = (ISLAND_RADIUS + 3) * 2;
  const seg = 180;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = [];
  const sand = new THREE.Color(0xe6d2a0);
  const sandWet = new THREE.Color(0xcbb488);
  const grass = new THREE.Color(0x5a9d4a);
  const grassDark = new THREE.Color(0x3d7a3a);
  const rock = new THREE.Color(0x7d7364);
  const seabed = new THREE.Color(0x1c4f6b);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = islandHeight(x, z);
    pos.setY(i, h);

    if (h < -0.6) {
      // submerged seabed: darken toward deep-water colour with depth so the
      // underwater part of the mesh disappears into the water.
      const d = THREE.MathUtils.smoothstep(h, -4.0, -0.6);
      tmp.copy(seabed).lerp(sandWet, d);
    } else if (h < 0.35) {
      // beach / wet sand blend around the waterline
      const w = THREE.MathUtils.smoothstep(h, -0.6, 0.35);
      tmp.copy(sandWet).lerp(sand, w);
    } else {
      const g = THREE.MathUtils.smoothstep(h, 0.35, 1.3);
      tmp.copy(sand).lerp(grass, g);
      // higher central ground gets darker/rockier
      const r = THREE.MathUtils.smoothstep(h, 1.8, 3.0);
      tmp.lerp(grassDark, r * 0.6);
      tmp.lerp(rock, THREE.MathUtils.smoothstep(h, 2.6, 3.4) * 0.5);
    }
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0.0,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}
buildIsland();

// ---------------------------------------------------------------------------
// Water with waves rolling toward the island
// ---------------------------------------------------------------------------
function buildWater() {
  const geo = new THREE.PlaneGeometry(320, 320, 256, 256);
  geo.rotateX(-Math.PI / 2);

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uShallow: { value: new THREE.Color(0x6fc7d6) },
      uDeep: { value: new THREE.Color(0x1d5a8a) },
      uFoam: { value: new THREE.Color(0xffffff) },
      uSun: { value: sun.position.clone().normalize() },
      uIslandRadius: { value: ISLAND_RADIUS },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uIslandRadius;
      varying vec3 vWorld;
      varying float vWave;
      varying float vShore;

      // Concentric waves travelling inward toward the island centre, plus a
      // couple of directional ripples for texture.
      float waveHeight(vec2 p) {
        float d = length(p);
        // inward-moving rings: phase increases with time at fixed radius,
        // crests move toward the centre.
        float rings = sin(d * 0.75 + uTime * 1.6) * 0.28;
        rings += sin(d * 1.7 - uTime * 0.8) * 0.08;
        // directional chop
        float dir = sin(dot(p, vec2(0.6, 0.8)) * 0.9 + uTime * 1.1) * 0.12;
        dir += sin(dot(p, vec2(-0.8, 0.4)) * 1.3 - uTime * 0.9) * 0.07;
        // calm the water very close to shore so waves "arrive" and settle
        float shore = smoothstep(uIslandRadius, uIslandRadius + 10.0, d);
        return (rings + dir) * mix(0.25, 1.0, shore);
      }

      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float h = waveHeight(wp.xz);
        wp.y += h;
        vWorld = wp.xyz;
        vWave = h;
        vShore = length(wp.xz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uShallow;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      uniform vec3 uSun;
      uniform float uIslandRadius;
      varying vec3 vWorld;
      varying float vWave;
      varying float vShore;

      void main() {
        vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
        vec3 viewDir = normalize(cameraPosition - vWorld);

        // depth-ish tint from distance to island edge
        float depth = smoothstep(uIslandRadius, uIslandRadius + 34.0, vShore);
        vec3 col = mix(uShallow, uDeep, depth);

        // fresnel sheen
        float fres = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);
        col += fres * 0.35;

        // specular glint from the sun
        vec3 h = normalize(uSun + viewDir);
        float spec = pow(max(dot(n, h), 0.0), 120.0);
        col += spec * 0.8;

        // foam: bright on wave crests and in a band hugging the shoreline
        float crest = smoothstep(0.18, 0.34, vWave);
        float shoreBand = 1.0 - smoothstep(uIslandRadius - 0.6, uIslandRadius + 1.6, vShore);
        float foamRing = shoreBand * (0.35 + 0.28 * sin(vShore * 3.0 - uTime * 4.0));
        float foam = clamp(crest * 0.5 + foamRing, 0.0, 1.0);
        col = mix(col, uFoam, foam);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_LEVEL;
  mesh.receiveShadow = false;
  scene.add(mesh);
  return mat;
}
const waterMat = buildWater();

// ---------------------------------------------------------------------------
// Grass that weaves along the wind (instanced blades, wind in the shader)
// ---------------------------------------------------------------------------
function buildGrass() {
  // One tapered blade, pivoting at its base (y = 0 at the bottom).
  const bladeH = 0.6;
  const blade = new THREE.PlaneGeometry(0.09, bladeH, 1, 4);
  blade.translate(0, bladeH / 2, 0);

  // Scatter blades across the grassy part of the island.
  const positions = [];
  const attempts = 42000;
  for (let i = 0; i < attempts; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * (ISLAND_RADIUS + 0.5);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const h = islandHeight(x, z);
    if (h > 0.7 && h < 2.7) {
      positions.push(x, h - 0.05, z);
    }
  }
  const count = positions.length / 3;

  const geo = new THREE.InstancedBufferGeometry();
  geo.index = blade.index;
  geo.attributes.position = blade.attributes.position;
  geo.attributes.uv = blade.attributes.uv;

  const offset = new Float32Array(positions);
  const orient = new Float32Array(count);
  const scaleA = new Float32Array(count);
  const tint = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    orient[i] = Math.random() * Math.PI;
    scaleA[i] = 0.7 + Math.random() * 0.7;
    tint[i] = Math.random();
  }
  geo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(offset, 3));
  geo.setAttribute('iOrient', new THREE.InstancedBufferAttribute(orient, 1));
  geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(scaleA, 1));
  geo.setAttribute('iTint', new THREE.InstancedBufferAttribute(tint, 1));

  const mat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWindDir: { value: new THREE.Vector2(0.8, 0.6).normalize() },
      uBase: { value: new THREE.Color(0x3f7d38) },
      uTip: { value: new THREE.Color(0x9ed36a) },
      uSun: { value: sun.position.clone().normalize() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uWindDir;
      attribute vec3 iOffset;
      attribute float iOrient;
      attribute float iScale;
      attribute float iTint;
      varying float vH;
      varying float vTint;

      void main() {
        vH = uv.y;          // 0 at base, 1 at tip
        vTint = iTint;

        // scale the blade
        vec3 p = position * vec3(1.0, iScale, 1.0);

        // rotate blade around Y for variety
        float c = cos(iOrient), s = sin(iOrient);
        p = vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);

        // wind: travelling wave across the field + a per-blade flutter.
        float phase = dot(iOffset.xz, uWindDir) * 0.35;
        float gust = sin(uTime * 1.6 + phase) * 0.5 + 0.5;      // 0..1 gust
        float sway = sin(uTime * 2.4 + phase) * 0.12
                   + sin(uTime * 5.3 + iOrient * 4.0) * 0.05;
        // bend grows with height (tip moves most); stronger during a gust.
        float bend = (sway + 0.10) * (0.4 + gust) * vH * vH;
        p.xz += uWindDir * bend * iScale * 1.6;

        vec3 world = iOffset + p;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBase;
      uniform vec3 uTip;
      varying float vH;
      varying float vTint;
      void main() {
        vec3 col = mix(uBase, uTip, vH);
        col *= 0.82 + vTint * 0.35;      // per-blade variation
        // subtle ambient occlusion toward the base
        col *= 0.6 + 0.4 * vH;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mat;
}
const grassMat = buildGrass();

// ---------------------------------------------------------------------------
// A small tree as the island's centrepiece
// ---------------------------------------------------------------------------
function buildTree() {
  const group = new THREE.Group();
  // place it a touch off-centre on high ground
  const tx = 1.2;
  const tz = -1.0;
  const ty = islandHeight(tx, tz);
  group.position.set(tx, ty, tz);

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a2b,
    roughness: 1.0,
  });
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.32, 2.6, 8),
    trunkMat
  );
  trunk.position.y = 1.3;
  trunk.castShadow = true;
  group.add(trunk);

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x4f9a3f,
    roughness: 0.9,
    flatShading: true,
  });
  const blobs = [
    [0, 2.9, 0, 1.5],
    [0.7, 2.5, 0.3, 1.05],
    [-0.6, 2.6, -0.2, 1.0],
    [0.1, 3.6, -0.3, 1.0],
    [-0.3, 3.0, 0.6, 0.9],
  ];
  for (const [x, y, z, r] of blobs) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMat);
    b.position.set(x, y, z);
    b.castShadow = true;
    group.add(b);
  }
  scene.add(group);
}
buildTree();

// ---------------------------------------------------------------------------
// Resize + render loop
// ---------------------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  waterMat.uniforms.uTime.value = t;
  grassMat.uniforms.uTime.value = t;
  controls.update();
  renderer.render(scene, camera);
}
animate();
