(() => {
  "use strict";

  function key(design) {
    return "juicebox.cart." + design;
  }

  function load(design) {
    try {
      var raw = window.sessionStorage.getItem(key(design));
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save(design, cart) {
    try {
      window.sessionStorage.setItem(key(design), JSON.stringify(cart || {}));
    } catch (e) {
      /* ignore — private browsing / storage disabled */
    }
  }

  function count(design) {
    var cart = load(design);
    var n = 0;
    Object.keys(cart).forEach(function (id) {
      n += cart[id] || 0;
    });
    return n;
  }

  window.JuiceboxCart = { load: load, save: save, count: count };

  // Paint a live item count onto any element marked data-cart-badge="<design>" —
  // used by Home/About's static "Cart" link, which (unlike the Shop screen) has no
  // React state of its own to drive a count.
  function paintBadges() {
    var els = document.querySelectorAll("[data-cart-badge]");
    els.forEach(function (el) {
      var design = el.getAttribute("data-cart-badge");
      var n = count(design);
      el.textContent = n > 0 ? "Cart · " + n : "Cart";
    });
    return els.length > 0;
  }

  if (!paintBadges()) {
    var observer = new MutationObserver(function () {
      if (paintBadges()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
