import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Nudges the final image warm and slightly more saturated/contrasty, so the
// scene's mismatched material colors read as one cohesive palette instead
// of flat and ungraded.
const WarmGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    tint: { value: new THREE.Vector3(1.03, 1.0, 0.96) },
    saturation: { value: 1.05 },
    contrast: { value: 1.02 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec3 tint;
    uniform float saturation;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb * tint;
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(vec3(luma), color, saturation);
      color = (color - 0.5) * contrast + 0.5;
      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

// Chains: base render -> bloom (glows genuinely bright pixels - the
// thruster flame's pale core, bullets, sun highlights) -> warm color grade
// -> output (re-applies the renderer's color space/tone mapping, since the
// composer's intermediate targets bypass it).
class PostProcessing {
  composer;
  bloomPass;

  constructor(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.25, // strength
      0.3, // radius
      0.96, // threshold - this renderer has no HDR/tone mapping, so flat
      // white UI elements (e.g. the loading screen's letter cubes) sit at
      // the same luminance=1.0 as genuine light sources; push this high
      // enough that only small, near-saturated hot spots (flame core,
      // bullets) bloom instead of blowing out large white surfaces
    );
    this.composer.addPass(this.bloomPass);

    this.composer.addPass(new ShaderPass(WarmGradeShader));
    this.composer.addPass(new OutputPass());
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
    this.bloomPass.setSize(width, height);
  }

  render() {
    this.composer.render();
  }
}

export default PostProcessing;
