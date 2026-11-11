(() => {
  "use strict";

  function wrap() {
    var root = document.getElementById("dc-root");
    if (!root || root.dataset.hoopsFramed) return;
    root.dataset.hoopsFramed = "1";

    var shell = document.createElement("div");
    shell.className = "hoops-phone-shell";
    var frame = document.createElement("div");
    frame.className = "hoops-phone-frame";

    root.parentNode.insertBefore(shell, root);
    frame.appendChild(root);
    shell.appendChild(frame);

    var caption = document.createElement("a");
    caption.className = "hoops-phone-caption";
    caption.href = "/mockups/hoopsbasketballacademy";
    caption.textContent = "← All designs · Hoops Basketball Academy preview";
    shell.appendChild(caption);

    var style = document.createElement("style");
    style.textContent =
      "@media (min-width:701px){" +
      ".hoops-phone-shell{min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:18px;background:#00103F;padding:48px 16px;" +
      "font-family:Inter,system-ui,sans-serif;}" +
      ".hoops-phone-frame{border-radius:44px;overflow:hidden;background:#000;" +
      "box-shadow:0 30px 70px rgba(0,8,40,.5),0 0 0 10px #00103F,0 0 0 12px #233463;}" +
      ".hoops-phone-frame > div{overflow:auto;}" +
      ".hoops-phone-caption{color:#B7C3E0;font-size:13px;font-weight:600;text-decoration:none;}" +
      ".hoops-phone-caption:hover,.hoops-phone-caption:focus-visible{color:#fff;}" +
      "}" +
      "@media (max-width:700px){.hoops-phone-caption{display:none;}}";
    document.head.appendChild(style);
  }

  if (document.getElementById("dc-root")) {
    wrap();
  } else {
    var observer = new MutationObserver(function () {
      if (document.getElementById("dc-root")) {
        wrap();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
