(() => {
  "use strict";

  const base = "/mockups/electric-sun-society/Choose%20a%20direction-html/";
  const concepts = {
  "a": {
    "name": "The Headliner",
    "desktop": "A · Homepage — Desktop-html/Main.dc.html",
    "mobile": "A · Homepage — Mobile-html/Mobile.dc.html",
    "rsvp": "A · RSVP flow — Oct 8 finale-html/RSVP.dc.html"
  },
  "b": {
    "name": "Hillside Press",
    "desktop": "B · Homepage — Desktop-html/HomeB.dc.html",
    "mobile": "B · Homepage — Mobile-html/MobileB.dc.html",
    "rsvp": "B · RSVP reply card — Oct 8 finale-html/RSVPB.dc.html"
  },
  "c": {
    "name": "Sound System",
    "desktop": "C · Homepage — Desktop-html/HomeC.dc.html",
    "mobile": "C · Homepage — Mobile-html/MobileC.dc.html",
    "rsvp": "C · Pre-save (RSVP) — Oct 8 finale-html/RSVPC.dc.html"
  }
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

  if (concepts[concept] && (currentLayout === "desktop" || currentLayout === "mobile")) {
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
    let observedRoot;
    const resize = new ResizeObserver(fitCanvas);
    function fitCanvas() {
      const root = document.querySelector('#dc-root');
      const canvas = root?.querySelector('.mockup-canvas');
      if (!canvas) return;
      if (root !== observedRoot) { resize.disconnect(); resize.observe(root); observedRoot = root; }
      const scale = Math.min(1, root.clientWidth / Number(canvas.dataset.nativeWidth));
      const zoom = String(scale);
      if (canvas.style.zoom !== zoom) canvas.style.zoom = zoom;
    }
    function refresh() { updateLinks(); fitCanvas(); }
    refresh();
    new MutationObserver(refresh).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['href'],
    });
    screenQuery.addEventListener('change', refresh);
    window.addEventListener('pageshow', refresh);

    const action = document.createElement('dialog');
    action.id = 'mockup-action';
    action.className = 'mockup-dialog';
    action.setAttribute('aria-labelledby', 'mockup-action-title');
    action.innerHTML = '<h2 id="mockup-action-title"></h2><p class="mockup-action-message"></p><button type="button" data-close-dialog>Back to preview</button>';
    document.body.append(action);
    const topics = {
      vend: ['Vendor application', 'This concept would open a vendor application here. No application has been submitted.'],
      pitch: ['Artist and wellness proposal', 'This concept would collect a proposal from an artist, DJ or wellness teacher. No proposal has been submitted.'],
      crew: ['Volunteer signup', 'This concept would collect volunteer details here. No signup has been submitted.'],
      give: ['Support Electric Sun Society', 'This concept would open the donation flow here. No donation or payment has been made.'],
      newsletter: ['Newsletter preview', 'Demo signup complete. No subscription was submitted.'],
    };
    function showAction(topic) {
      const [title, message] = topics[topic];
      action.querySelector('h2').textContent = title;
      action.querySelector('p').textContent = message;
      action.showModal();
    }
    action.querySelector('[data-close-dialog]').addEventListener('click', () => action.close());
    action.addEventListener('click', event => { if (event.target === action) { const r = action.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) action.close(); } });

    const menu = document.createElement('dialog');
    menu.id = 'mockup-mobile-menu';
    menu.className = 'mockup-dialog';
    menu.setAttribute('aria-label', 'Site navigation');
    menu.innerHTML = '<button type="button" data-close-dialog>Close menu</button><nav aria-label="Mobile navigation"></nav>';
    document.body.append(menu);
    menu.querySelector('[data-close-dialog]').addEventListener('click', () => menu.close());
    menu.addEventListener('close', () => document.querySelector('[data-mobile-menu]')?.setAttribute('aria-expanded', 'false'));
    menu.addEventListener('click', event => { if (event.target.closest('a')) menu.close(); });
    const sectionNames = { top: 'Home', hill: 'On the hill', ritual: 'The ritual', season: 'The season', story: 'Our story', involved: 'Get involved', newsletter: 'Stay in the loop', letter: 'Our story', rsvp: 'The finale', calendar: 'The season', help: 'Get involved', genres: 'The sound', tracklist: 'The ritual', sessions: 'The season', liner: 'Getting there', credits: 'Get involved' };
    document.addEventListener('click', event => {
      const topic = event.target.closest?.('[data-demo-topic]');
      if (topic && topics[topic.dataset.demoTopic]) { event.preventDefault(); showAction(topic.dataset.demoTopic); return; }
      const signup = event.target.closest?.('[data-demo-newsletter]');
      if (signup) {
        const email = document.querySelector('#dc-root input[type="email"]');
        if (email?.reportValidity()) showAction('newsletter');
        return;
      }
      const toggle = event.target.closest?.('[data-mobile-menu]');
      if (toggle) {
        const nav = menu.querySelector('nav');
        nav.replaceChildren();
        for (const section of document.querySelectorAll('#dc-root section[id]')) {
          const link = document.createElement('a');
          link.href = '#' + section.id;
          link.textContent = sectionNames[section.id] || section.id;
          nav.append(link);
        }
        if (concepts[concept]) {
          const link = document.createElement('a');
          link.href = base + concepts[concept].rsvp.split('/').map(encodeURIComponent).join('/');
          link.textContent = 'Try the RSVP demo';
          nav.append(link);
        }
        toggle.setAttribute('aria-expanded', 'true');
        menu.showModal();
      }
    });
    // Exported newsletter buttons do not have a backend. Handle Enter as well.
    document.addEventListener('submit', event => {
      if (!event.target.matches('#dc-root form') || currentLayout === 'rsvp') return;
      event.preventDefault();
      if (event.target.reportValidity()) showAction('newsletter');
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
})();
