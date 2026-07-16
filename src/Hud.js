// The "Press ENTER" modal overlay. Caches the DOM nodes once instead of
// querying them every frame from the update loops.
class Hud {
  container = document.getElementById('modal-container');
  text = document.getElementById('modal-text');
  img = document.getElementById('modal-img');

  setMessage(text, imgPath) {
    if (text !== undefined) this.text.textContent = text;
    if (imgPath !== undefined) this.img.data = imgPath;
  }

  show() {
    this.container.classList.add('six');
    this.container.classList.remove('out');
  }

  hide() {
    this.container.classList.add('out');
  }
}

// Single DOM, single instance.
export default new Hud();
