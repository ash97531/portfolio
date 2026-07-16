// Keyboard and touch controls. Translates input events into changes on the
// player's `dir`/`speed` state; the physics loop consumes them.
class InputManager {
  app;

  constructor(app) {
    this.app = app;

    window.addEventListener('keydown', (e) => this.keydown(e), false);
    window.addEventListener('keyup', (e) => this.keyup(e), false);
    window.addEventListener('keypress', (e) => this.keypress(e), false);

    this.setupTouchControls();
  }

  get player() {
    return this.app.player;
  }

  // Single Enter handler for the whole app: starts the main scene from the
  // loading screen, then delegates to whichever section the UFO is on.
  handleEnter() {
    const app = this.app;
    if (!app.enterKeyPressed) {
      if (app.animationLoaded) app.startMainScene();
      return;
    }
    app.placeContactLinksClass?.onEnter();
    app.placeProjectsClass?.onEnter();
    app.placeExperienceClass?.onEnter();
  }

  keydown(event) {
    if (event.key === 'Enter') {
      this.handleEnter();
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'd' || key === 'arrowright') {
      this.player.dir.right = true;
    }
    if (key === 'a' || key === 'arrowleft') {
      this.player.dir.left = true;
    }
    if (key === 's' || key === 'arrowdown' || this.player.dir.forward) {
      this.player.dir.forward = true;
      this.player.speed += this.player.acceleration;
    }
    if (key === 'w' || key === 'arrowup' || this.player.dir.back) {
      this.player.dir.back = true;
      this.player.speed -= this.player.acceleration;
    }
  }

  keyup(event) {
    const key = event.key.toLowerCase();
    if (key === 'd' || key === 'arrowright') this.player.dir.right = false;
    if (key === 'a' || key === 'arrowleft') this.player.dir.left = false;
    if (key === 's' || key === 'arrowdown') {
      this.player.dir.forward = false;
      this.player.speed = 0;
    }
    if (key === 'w' || key === 'arrowup') {
      this.player.dir.back = false;
      this.player.speed = 0;
    }
  }

  keypress(event) {
    const key = event.key.toLowerCase();

    if (key === ' ') {
      this.player.jump(this.app.cameraRig.camera.position.z);
    }
  }

  setupTouchControls() {
    function isTouchDevice() {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
      );
    }

    if (!isTouchDevice()) {
      document.getElementById('vertical-controls').style.display = 'none';
      document.getElementById('controls').style.display = 'none';
    } else {
      this.app.cameraRig.camera.position.set(13, -23, 39);
    }

    let ufofront, ufoback;

    document.getElementById('upButton').addEventListener('touchstart', (e) => {
      e.preventDefault();
      ufofront = setInterval(() => {
        this.player.dir.back = true;
        this.player.speed -= this.player.acceleration;
      }, 1000 / 60);
    });

    document.getElementById('upButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      clearInterval(ufofront);
      this.player.dir.back = false;
      this.player.speed = 0;
    });

    document
      .getElementById('downButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        ufoback = setInterval(() => {
          this.player.dir.forward = true;
          this.player.speed += this.player.acceleration;
        }, 1000 / 60);
      });

    document.getElementById('downButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      clearInterval(ufoback);
      this.player.dir.forward = false;
      this.player.speed = 0;
    });

    document
      .getElementById('leftButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.player.dir.left = true;
      });

    document.getElementById('leftButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.dir.left = false;
    });

    document
      .getElementById('rightButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.player.dir.right = true;
      });

    document.getElementById('rightButton').addEventListener('touchend', (e) => {
      e.preventDefault();
      this.player.dir.right = false;
    });

    document
      .getElementById('jumpButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.player.jump(this.app.cameraRig.camera.position.z);
      });

    document
      .getElementById('enterButton')
      .addEventListener('touchstart', (e) => {
        e.preventDefault();

        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          keyCode: 13,
          which: 13,
          code: 'Enter',
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(enterEvent);
      });
  }
}

export default InputManager;
