(function (root) {
  var PIE_NORMAL = 'Creado por Álvaro GT y sus minions';
  var PIE_OSOS = 'Creado por osos, no por pandas';
  var TZ = 'Europe/Madrid';

  function ymdMadrid(date) {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date || new Date());
  }

  function hashYmd(ymd) {
    var h = 2166136261;
    var s = String(ymd);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function esDiaOsos(ymd) {
    return (hashYmd(ymd) % 20) === 0;
  }

  function textoPie(ymd) {
    return esDiaOsos(ymd) ? PIE_OSOS : PIE_NORMAL;
  }

  function aplicarPie(doc) {
    var d = doc || (typeof document !== 'undefined' ? document : null);
    if (!d) return textoPie(ymdMadrid(new Date()));
    var texto = textoPie(ymdMadrid(new Date()));
    var list = d.querySelectorAll('footer');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var html = el.innerHTML;
      if (html.indexOf(PIE_NORMAL) === -1 && html.indexOf(PIE_OSOS) === -1) continue;
      el.innerHTML = html.split(PIE_NORMAL).join(texto).split(PIE_OSOS).join(texto);
    }
  }

  root.__pieCasa = {
    PIE_NORMAL: PIE_NORMAL,
    PIE_OSOS: PIE_OSOS,
    ymdMadrid: ymdMadrid,
    hashYmd: hashYmd,
    esDiaOsos: esDiaOsos,
    textoPie: textoPie,
    aplicarPie: aplicarPie
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { aplicarPie(document); });
    } else {
      aplicarPie(document);
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
