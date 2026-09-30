(function () {
  var HOLD = 600;
  var h1 = document.querySelector('h1');
  var egg = document.getElementById('oso-egg');
  if (!h1 || !egg) return;

  var timer = 0;
  var armed = false;

  function show() {
    egg.hidden = false;
    armed = false;
  }

  function hide() {
    egg.hidden = true;
    armed = false;
  }

  function cancelHold() {
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  h1.addEventListener('pointerdown', function (e) {
    if (e.button) return;
    cancelHold();
    timer = setTimeout(function () {
      timer = 0;
      show();
    }, HOLD);
  });

  h1.addEventListener('pointerup', function () {
    cancelHold();
    if (!egg.hidden) armed = true;
  });
  h1.addEventListener('pointercancel', cancelHold);
  h1.addEventListener('pointerleave', cancelHold);
  h1.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  egg.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (armed && !egg.hidden) hide();
  });
})();
