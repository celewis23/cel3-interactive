(() => {
  "use strict";

  function wrap() {
    var root = document.getElementById("dc-root");
    if (!root || root.dataset.juiceboxFramed) return;
    root.dataset.juiceboxFramed = "1";

    var shell = document.createElement("div");
    shell.className = "juicebox-phone-shell";
    var frame = document.createElement("div");
    frame.className = "juicebox-phone-frame";

    root.parentNode.insertBefore(shell, root);
    frame.appendChild(root);
    shell.appendChild(frame);

    var caption = document.createElement("a");
    caption.className = "juicebox-phone-caption";
    caption.href = "/mockups/juliansjuicebox";
    caption.textContent = "← All designs · Julian's Juicebox preview";
    shell.appendChild(caption);

    var design = document.querySelector("script[data-design]");
    design = design && design.dataset.design;
    var selectedRole = document.currentScript && document.currentScript.dataset.role;
    if (design) {
      var roles = document.createElement("nav");
      roles.className = "juicebox-role-switcher";
      roles.setAttribute("aria-label", "Preview role");
      var base = "/mockups/juliansjuicebox/" + design + "/app";
      roles.innerHTML =
        '<a href="' + base + '/owner"' + (selectedRole === "owner" ? ' aria-current="page"' : "") + ">Owner</a>" +
        '<a href="' + base + '"' + (selectedRole === "customer" ? ' aria-current="page"' : "") + ">Customer</a>";
      shell.insertBefore(roles, frame);
    }

    var style = document.createElement("style");
    style.textContent =
      "@media (min-width:701px){" +
      ".juicebox-phone-shell{min-height:100vh;box-sizing:border-box;display:flex;flex-direction:column;" +
      "align-items:center;justify-content:center;gap:14px;background:#141a16;padding:48px 16px;" +
      "font-family:Inter,system-ui,sans-serif;}" +
      ".juicebox-role-switcher{display:flex;gap:8px;background:rgba(255,255,255,.08);border-radius:999px;padding:4px;}" +
      ".juicebox-role-switcher a{color:#c9d2c4;text-decoration:none;font-size:13px;font-weight:700;padding:8px 18px;border-radius:999px;}" +
      ".juicebox-role-switcher a[aria-current=page]{background:#f2c230;color:#141a16;}" +
      ".juicebox-phone-frame{border-radius:44px;overflow:hidden;background:#000;" +
      "box-shadow:0 30px 70px rgba(0,8,40,.5),0 0 0 10px #141a16,0 0 0 12px #2d3a31;}" +
      ".juicebox-phone-frame > div{overflow:auto;}" +
      ".juicebox-phone-caption{color:#c9d2c4;font-size:13px;font-weight:600;text-decoration:none;}" +
      ".juicebox-phone-caption:hover,.juicebox-phone-caption:focus-visible{color:#fff;}" +
      "}" +
      "@media (max-width:700px){.juicebox-phone-caption,.juicebox-role-switcher{display:none;}}";
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
