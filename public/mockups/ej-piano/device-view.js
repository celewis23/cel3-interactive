(() => {
  "use strict";

  // Adapted from the same-named script used by this repo's other client mockups
  // (e.g. public/mockups/glue-craft-studio/device-view.js) — same pattern: redirect
  // between a desktop and a dedicated mobile export based on viewport width, with an
  // explicit ?view= override that survives the redirect.
  const BASE = "/mockups/ej-piano/";
  const concepts = {
    a: { desktop: "a/site.dc.html", mobile: "a/Website A · Mobile-html/Mobile-A.dc.html" },
    b: { desktop: "b/site.dc.html", mobile: "b/Website B · Mobile-html/Mobile-B.dc.html" },
    c: { desktop: "c/site.dc.html", mobile: "c/Website C · Mobile-html/Mobile-C.dc.html" },
  };
  const screenQuery = window.matchMedia("(max-width: 767px)");
  const automaticLayout = () => (screenQuery.matches ? "mobile" : "desktop");
  const entryLayout = automaticLayout();
  const script = document.currentScript;
  const concept = script?.dataset.concept;
  const currentLayout = script?.dataset.layout;
  const requested = new URLSearchParams(location.search).get("view");
  const explicitLayout = requested === "mobile" || requested === "desktop" ? requested : null;

  function address(key, layout, forced = false) {
    const item = concepts[key];
    return BASE + encodeURI(item[layout]) + (forced ? `?view=${layout}` : "");
  }

  if (concepts[concept] && currentLayout) {
    const layout = explicitLayout ?? entryLayout;
    if (layout !== currentLayout) {
      const target = new URL(address(concept, layout), location.origin);
      target.search = location.search;
      target.hash = location.hash;
      // Direct/bookmarked links land on the right export too, without a back-button loop.
      location.replace(target.href);
      return;
    }
    // A deliberately selected desktop preview on a phone stays zoomable rather than
    // squeezed into device-width.
    if (explicitLayout === "desktop" && screenQuery.matches) {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) vp.content = "width=1280";
    }
  }

  function updateLinks() {
    if (!concepts[concept]) return;
    for (const link of document.querySelectorAll("a[data-view]")) {
      const view = link.dataset.view;
      const target = new URL(address(concept, view === "auto" ? entryLayout : view, view !== "auto"), location.origin).href;
      if (link.href !== target) link.href = target;
      if (view === (explicitLayout ?? "auto")) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    }
  }

  function ready() {
    updateLinks();
    new MutationObserver(updateLinks).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["href"],
    });
    screenQuery.addEventListener("change", updateLinks);
    window.addEventListener("pageshow", updateLinks);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
