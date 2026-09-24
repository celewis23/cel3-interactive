(() => {
  "use strict";

  const base = "/mockups/neejah-styles/Home%20%E2%80%94%20Choose%20a%20Direction-html/";
  const concepts = {
    a: {
      desktop: "Option A — Golden Hour (Desktop)-html/Main.dc.html",
      mobile: "Option A — Golden Hour (Mobile)-html/Mobile.dc.html",
    },
    b: {
      desktop: "Option B — Boutique Classic (Desktop)-html/Editorial.dc.html",
      mobile: "Option B — Boutique Classic (Mobile)-html/EditorialMobile.dc.html",
    },
    c: {
      desktop: "Option C — Sunkissed Modern (Desktop)-html/Ticket.dc.html",
      mobile: "Option C — Sunkissed Modern (Mobile)-html/TicketMobile.dc.html",
    },
    d: {
      desktop: "Option D — Interactive Experience-html/Flagship.dc.html",
      mobile: "Option D — Interactive Experience (Mobile)-html/FlagshipMobile.dc.html",
    },
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
    return base + item[layout].split('/').map(encodeURIComponent).join('/') + (forced ? `?view=${layout}` : "");
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
    let noticeTimer;
    function showNotice(message) {
      let notice = document.querySelector('.mockup-notice');
      if (!notice) {
        notice = document.createElement('div');
        notice.className = 'mockup-notice';
        notice.setAttribute('role', 'status');
        document.body.append(notice);
      }
      notice.textContent = message;
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => notice.remove(), 7000);
    }
    document.addEventListener('submit', event => {
      if (!event.target.matches('#dc-root form[data-demo-newsletter]')) return;
      event.preventDefault();
      if (event.target.reportValidity()) {
        showNotice('Demo signup complete. No subscription was submitted.');
      }
    }, true);
    document.addEventListener('click', event => {
      const button = event.target.closest?.('#dc-root [data-demo-add], #dc-root [data-demo-checkout]');
      if (!button || button.disabled) return;
      showNotice(button.hasAttribute('data-demo-checkout')
        ? 'Checkout preview only. No payment or order was submitted.'
        : 'Shopping preview. Try Option D to explore the interactive bag.');
    });
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
