let pressed = false;
document.getElementById('modal-container').classList.add('six');
window.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    if (!pressed) {
      pressed = true;
      for (let i = 0; i < 1000; i++)
        document.getElementById('modal-container').classList.add('out');
      for (let i = 0; i < 1000; i++)
        document.getElementById('svg1').data = 'images/teleporter.png';
    } else {
      for (let i = 0; i < 1000; i++)
        document.getElementById('svg1').data = 'images/teleporter.png';
      document.getElementById('modal-container').classList.remove('out');
      pressed = false;
    }
  }
});
