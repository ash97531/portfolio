import * as THREE from 'three';

// Game-start jingle followed by looping background music.
class AudioManager {
  listener;
  sound;

  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.sound = new THREE.Audio(this.listener);
  }

  // Browsers suspend the audio context until a user gesture; resume if needed.
  start(assets) {
    if (this.listener.context.state === 'suspended') {
      this.listener.context.resume().then(() => {
        this.playAudio(assets);
      });
    } else {
      this.playAudio(assets);
    }
  }

  playAudio(assets) {
    this.sound.setBuffer(assets['gamestart']);
    this.sound.setLoop(false);
    this.sound.setVolume(0.8);
    this.sound.play();

    setTimeout(() => {
      this.sound.stop();
      this.sound.setBuffer(assets['backgroundmusic']);
      this.sound.setLoop(true);
      this.sound.setVolume(0.1);
      this.sound.play();
    }, 1500);
  }
}

export default AudioManager;
