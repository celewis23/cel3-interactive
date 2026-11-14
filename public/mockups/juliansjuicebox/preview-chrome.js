(() => {
  "use strict";
  var ROOT = "/mockups/juliansjuicebox";
  var script = document.currentScript;
  var section = (script && script.dataset.section) || "";
  var design = script && script.dataset.design; // "a" | "b" | "c" — absent on the overview page

  var SECTIONS = design
    ? [
        { key: "site", label: "Website", href: ROOT + "/" + design + "/site" },
        { key: "console", label: "Console", href: ROOT + "/" + design + "/console" },
        { key: "app", label: "Apps", href: ROOT + "/" + design + "/app/owner" },
      ]
    : [];

  function mount() {
    if (document.getElementById("juicebox-chrome")) return;
    var links = SECTIONS.map(function (s) {
      var cls = "sw" + (s.key === section ? " active" : "");
      return '<a class="' + cls + '" href="' + s.href + '">' + s.label + "</a>";
    }).join('<span class="sep">·</span>');

    var wrap = document.createElement("div");
    wrap.setAttribute("data-preview-chrome-root", "");
    wrap.innerHTML =
      "<style>" +
      "#juicebox-chrome{position:fixed;right:14px;bottom:14px;z-index:999999;font-family:Inter,system-ui,sans-serif;" +
      "display:flex;flex-direction:column;align-items:flex-end;gap:6px;}" +
      "#juicebox-chrome .pill{display:flex;align-items:center;gap:10px;background:#141a16;color:#fff;border-radius:999px;" +
      "padding:9px 16px;box-shadow:0 10px 30px rgba(0,8,40,.35);font-size:12px;font-weight:700;}" +
      "#juicebox-chrome a{color:#fff;text-decoration:none;white-space:nowrap;min-height:24px;display:inline-flex;align-items:center;}" +
      "#juicebox-chrome a:hover,#juicebox-chrome a:focus-visible{color:#f2c230;}" +
      "#juicebox-chrome .sep{opacity:.4;}" +
      "#juicebox-chrome .sw{opacity:.65;}" +
      "#juicebox-chrome .sw.active{opacity:1;color:#f2c230;}" +
      "#juicebox-chrome .badge{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c9d2c4;" +
      "background:rgba(255,255,255,.1);border-radius:999px;padding:4px 10px;}" +
      "@media (max-width:520px){#juicebox-chrome{right:8px;bottom:8px;}" +
      "#juicebox-chrome .pill{padding:7px 11px;gap:7px;font-size:11px;max-width:calc(100vw - 16px);box-sizing:border-box;flex-wrap:wrap;justify-content:center;}}" +
      "</style>" +
      '<div id="juicebox-chrome">' +
      '<span class="badge">Preview · sample data</span>' +
      '<div class="pill"><a href="' + ROOT + '">← Back to overview</a>' +
      (links ? '<span class="sep">|</span>' + links : "") +
      "</div>" +
      "</div>";
    document.body.appendChild(wrap);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
