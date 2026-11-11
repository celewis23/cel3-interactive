(() => {
  "use strict";
  var ROOT = "/mockups/hoopsbasketballacademy";
  var section = (document.currentScript && document.currentScript.dataset.section) || "";
  var SECTIONS = [
    { key: "site", label: "Website", href: ROOT + "/site" },
    { key: "console", label: "Console", href: ROOT + "/console" },
    { key: "app", label: "Apps", href: ROOT + "/app/parent" },
  ];

  function mount() {
    if (document.getElementById("hoops-chrome")) return;
    var links = SECTIONS.map(function (s) {
      var cls = "sw" + (s.key === section ? " active" : "");
      return '<a class="' + cls + '" href="' + s.href + '">' + s.label + "</a>";
    }).join('<span class="sep">·</span>');

    var wrap = document.createElement("div");
    wrap.setAttribute("data-preview-chrome-root", "");
    wrap.innerHTML =
      "<style>" +
      "#hoops-chrome{position:fixed;right:14px;bottom:14px;z-index:999999;font-family:Inter,system-ui,sans-serif;" +
      "display:flex;flex-direction:column;align-items:flex-end;gap:6px;}" +
      "#hoops-chrome .pill{display:flex;align-items:center;gap:10px;background:#012169;color:#fff;border-radius:999px;" +
      "padding:9px 16px;box-shadow:0 10px 30px rgba(0,8,40,.35);font-size:12px;font-weight:700;}" +
      "#hoops-chrome a{color:#fff;text-decoration:none;white-space:nowrap;min-height:24px;display:inline-flex;align-items:center;}" +
      "#hoops-chrome a:hover,#hoops-chrome a:focus-visible{color:#FF6A13;}" +
      "#hoops-chrome .sep{opacity:.4;}" +
      "#hoops-chrome .sw{opacity:.65;}" +
      "#hoops-chrome .sw.active{opacity:1;color:#FF6A13;}" +
      "#hoops-chrome .badge{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#B7C3E0;" +
      "background:rgba(255,255,255,.1);border-radius:999px;padding:4px 10px;}" +
      "@media (max-width:520px){#hoops-chrome{right:8px;bottom:8px;}" +
      "#hoops-chrome .pill{padding:7px 11px;gap:7px;font-size:11px;max-width:calc(100vw - 16px);box-sizing:border-box;flex-wrap:wrap;justify-content:center;}}" +
      "</style>" +
      '<div id="hoops-chrome">' +
      '<span class="badge">Preview · sample data</span>' +
      '<div class="pill"><a href="' + ROOT + '">← Back to overview</a><span class="sep">|</span>' + links + "</div>" +
      "</div>";
    document.body.appendChild(wrap);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
