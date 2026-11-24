
(function () {
  function findLabel() {
    var all = document.body.querySelectorAll('*');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el.children.length === 0 && /^\s*The Odyssey\s*$/i.test(el.textContent || '')) return el;
    }
    return null;
  }
  function outerPinned(el) {
    var fixed = null, abs = null, n = el;
    while (n && n !== document.body && n !== document.documentElement) {
      var pos = getComputedStyle(n).position;
      if (pos === 'fixed') fixed = n;
      else if (pos === 'absolute') abs = n;
      n = n.parentElement;
    }
    return fixed || abs || el;
  }
  function relocate() {
    var label = findLabel();
    if (!label) return false;
    outerPinned(label).classList.add('ux-odyssey');
    return true;
  }
  function start() {
    if (relocate()) return;
    var obs = new MutationObserver(function () { if (relocate()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { obs.disconnect(); }, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
