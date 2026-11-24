(() => {
  "use strict";
  var ROOT = "/mockups/awomansmindset";
  var section = (document.currentScript && document.currentScript.dataset.section) || "";
  // Read the concept from the URL rather than a data-attribute: the two concepts
  // (editorial / noir) each have their own site + studio, so the right "Studio" link
  // depends on which concept is currently open.
  var pathMatch = /\/mockups\/awomansmindset\/(editorial|noir)/.exec(location.pathname);
  var concept = pathMatch ? pathMatch[1] : null;

  var SECTIONS = concept
    ? [
        { key: "site", label: "Website", href: ROOT + "/" + concept },
        { key: "console", label: "Studio", href: ROOT + "/" + concept + "/studio" },
      ]
    : [];

  function mount() {
    if (document.getElementById("awm-chrome")) return;
    var links = SECTIONS.map(function (s) {
      var cls = "sw" + (s.key === section ? " active" : "");
      return '<a class="' + cls + '" href="' + s.href + '">' + s.label + "</a>";
    }).join('<span class="sep">·</span>');

    var wrap = document.createElement("div");
    wrap.setAttribute("data-preview-chrome-root", "");
    wrap.innerHTML =
      "<style>" +
      "#awm-chrome{position:fixed;right:14px;bottom:14px;z-index:999999;font-family:Manrope,system-ui,sans-serif;" +
      "display:flex;flex-direction:column;align-items:flex-end;gap:6px;}" +
      "#awm-chrome .pill{display:flex;align-items:center;gap:10px;background:#2A0910;color:#FBF4EE;border-radius:999px;" +
      "padding:9px 16px;box-shadow:0 10px 30px rgba(42,9,16,.4);font-size:12px;font-weight:700;}" +
      "#awm-chrome a{color:#FBF4EE;text-decoration:none;white-space:nowrap;min-height:24px;display:inline-flex;align-items:center;}" +
      "#awm-chrome a:hover,#awm-chrome a:focus-visible{color:#EDB2BF;}" +
      "#awm-chrome .sep{opacity:.4;}" +
      "#awm-chrome .sw{opacity:.65;}" +
      "#awm-chrome .sw.active{opacity:1;color:#EDB2BF;}" +
      "#awm-chrome .badge{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#E9CDB0;" +
      "background:rgba(255,255,255,.1);border-radius:999px;padding:4px 10px;}" +
      "@media (max-width:520px){#awm-chrome{right:8px;bottom:8px;}" +
      "#awm-chrome .pill{padding:7px 11px;gap:7px;font-size:11px;max-width:calc(100vw - 16px);box-sizing:border-box;flex-wrap:wrap;justify-content:center;}}" +
      "</style>" +
      '<div id="awm-chrome">' +
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
