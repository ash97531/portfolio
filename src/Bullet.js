import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// UFO blaster bolts, fired forward on Shift. Each bolt is a small DYNAMIC
// physics body that stays collision-responsive, so it knocks into whatever
// it hits (bricks, flashlights, ...) with real momentum before vanishing -
// staying DYNAMIC (rather than KINEMATIC) also matters for detection: cannon-es
// only runs real narrowphase contacts (and fires 'collide') for
// DYNAMIC-vs-anything pairs, while KINEMATIC-vs-STATIC pairs are
// overlap-tested only and never dispatch the event. Gravity is defeated
// every frame by re-asserting the bolt's own constant velocity (this only
// touches the bolt's velocity, not the target's - the impulse the target
// received during the physics step is untouched), so it still flies dead
// straight up until the moment it lands a hit.
const BULLET_RADIUS = 0.12; // big enough to read clearly against the world
const BULLET_SPEED = 10; // fast enough to feel like a shot, slow enough to track
const BULLET_MASS = 0.35; // kg - enough momentum to knock over a 0.2kg brick/flashlight
const BULLET_LIFETIME = 3; // seconds before an unobstructed bolt vanishes
const SPAWN_OFFSET = 0.9; // local +Y offset clear of the UFO's own hull
const BULLET_COLOR = 0xb8963e; // dark golden yellow
// A stack of resting bricks damps a plain contact impulse almost instantly
// (friction against its neighbors), so a hit alone barely nudges it. Apply
// an explicit impulse instead - big enough to visibly knock the target over
// - offset from its center at roughly the bolt's contact point so it topples
// rather than just sliding.
const KNOCKBACK_IMPULSE = 2.2; // kg*m/s

class BulletManager {
  scene;
  world;
  bullets = [];

  // scratch objects reused every shot to avoid per-frame allocations.
  // Local -Y, not +Y: the camera trails the UFO along world -Y and looks
  // toward +Y, and dir.back (w/arrowup - the key that visually flies the
  // ship forward, away from the camera) drives it along local -Y. dir.forward
  // (s/arrowdown) is the visually-backward key despite its name, and moves
  // local +Y - firing bullets that way sent them out the back of the ship.
  _spawnLocal = new CANNON.Vec3(0, -SPAWN_OFFSET, 0);
  _localForward = new CANNON.Vec3(0, -1, 0);
  _spawnPos = new CANNON.Vec3();
  _velocity = new CANNON.Vec3();
  _impulse = new CANNON.Vec3();
  _contactPoint = new CANNON.Vec3();

  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
  }

  fire(ufobody) {
    ufobody.quaternion.vmult(this._spawnLocal, this._spawnPos);
    this._spawnPos.vadd(ufobody.position, this._spawnPos);

    ufobody.quaternion.vmult(this._localForward, this._velocity);
    this._velocity.scale(BULLET_SPEED, this._velocity);

    const geometry = new THREE.SphereGeometry(BULLET_RADIUS, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: BULLET_COLOR });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(this._spawnPos);
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: BULLET_MASS,
      shape: new CANNON.Sphere(BULLET_RADIUS),
    });
    body.position.copy(this._spawnPos);
    body.velocity.copy(this._velocity);
    this.world.addBody(body);

    const bullet = {
      mesh,
      body,
      velocity: this._velocity.clone(),
      age: 0,
      hit: false,
    };
    body.addEventListener('collide', (e) => {
      bullet.hit = true;

      const target = e.body;
      if (target.mass > 0) {
        this._impulse.copy(bullet.velocity);
        this._impulse.normalize();
        this._impulse.scale(KNOCKBACK_IMPULSE, this._impulse);
        this._contactPoint.copy(bullet.body.position);
        this._contactPoint.vsub(target.position, this._contactPoint);
        target.applyImpulse(this._impulse, this._contactPoint);
      }
    });

    this.bullets.push(bullet);
  }

  update(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.age += dt;
      // cancel gravity's pull on velocity so the bolt keeps flying straight
      bullet.body.velocity.copy(bullet.velocity);

      if (bullet.hit || bullet.age >= BULLET_LIFETIME) {
        this.world.removeBody(bullet.body);
        this.scene.remove(bullet.mesh);
        bullet.mesh.geometry.dispose();
        bullet.mesh.material.dispose();
        this.bullets.splice(i, 1);
        continue;
      }

      bullet.mesh.position.copy(bullet.body.position);
    }
  }
}

export default BulletManager;
