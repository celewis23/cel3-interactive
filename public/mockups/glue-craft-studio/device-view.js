(() => {
  "use strict";

  const base = "/mockups/glue-craft-studio/Home%20(client%20landing%20page)-html/";
  const concepts = {
    a: { folder: "Cut & Paste", desktop: "Main.dc.html", mobile: "Mobile.dc.html" },
    b: { folder: "Open Studio", desktop: "OpenStudio.dc.html", mobile: "OpenStudioMobile.dc.html" },
    c: { folder: "Overprint", desktop: "Overprint.dc.html", mobile: "OverprintMobile.dc.html" },
  };
  const screenQuery = window.matchMedia("(max-width: 1199px)");
  const automaticLayout = () => screenQuery.matches ? "mobile" : "desktop";
  const entryLayout = automaticLayout();
  const script = document.currentScript;
  const concept = script?.dataset.concept;
  const currentLayout = script?.dataset.layout;
  const requested = new URLSearchParams(location.search).get("view");
  const explicitLayout = requested === "mobile" || requested === "desktop" ? requested : null;
  let initialFragment = location.hash.slice(1);
  try { initialFragment = decodeURIComponent(initialFragment); } catch { /* Keep malformed fragments harmless. */ }

  function address(key, layout, forced = false) {
    const item = concepts[key];
    const folder = encodeURIComponent(item.folder + " · " + (layout === "mobile" ? "Mobile" : "Desktop") + "-html");
    return base + folder + "/" + item[layout] + (forced ? `?view=${layout}` : "");
  }

  if (concepts[concept] && currentLayout) {
    const layout = explicitLayout ?? entryLayout;
    if (layout !== currentLayout) {
      const target = new URL(address(concept, layout), location.origin);
      target.search = location.search;
      target.hash = location.hash;
      // Direct/bookmarked links choose the right export too, without a back-button loop.
      location.replace(target.href);
      return;
    }
    // A deliberately selected desktop preview on a phone remains zoomable.
    if (explicitLayout === "desktop" && screenQuery.matches) {
      document.querySelector('meta[name="viewport"]').content = "width=1440";
    }
  }

  function updateLinks() {
    for (const link of document.querySelectorAll("a[data-concept]")) {
      if (concepts[link.dataset.concept]) {
        const target = new URL(address(link.dataset.concept, automaticLayout()), location.origin).href;
        if (link.href !== target) link.href = target;
      }
    }
    if (initialFragment) {
      const section = document.getElementById(initialFragment);
      if (section?.closest("#dc-root")) {
        initialFragment = "";
        requestAnimationFrame(() => section.scrollIntoView());
      }
    }
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
    // The export mounts asynchronously, then fetches its source and can restore
    // original href attributes. Reapply device selection only when a URL differs.
    new MutationObserver(updateLinks).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["href"],
    });
    screenQuery.addEventListener("change", updateLinks);
    window.addEventListener("pageshow", updateLinks);
    // Keep an open concept's form/filter state when rotating or resizing. New
    // navigations select the current screen size; the view switch is always available.
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
