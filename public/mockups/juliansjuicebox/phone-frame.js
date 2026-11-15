(() => {
  'use strict';
  const appPath = /^\/mockups\/juliansjuicebox\/[abc]\/app(?:\/|$)/;
  let embedded = false;
  try { embedded = window.parent !== window && window.parent.JJPhonePreview === window.frameElement; } catch { /* A separate site may embed the preview. */ }
  if (embedded) {
    // External preview destinations leave the phone; app links stay inside it.
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return;
      const url = new URL(link.href);
      if (url.origin === location.origin && !appPath.test(url.pathname)) {
        event.preventDefault(); window.parent.location.assign(url.href);
      }
    });
    return;
  }
  const role = document.currentScript?.dataset.role || (location.pathname.includes('/app/owner') ? 'owner' : 'customer');
  function fit() {
    const scale = Math.max(.1, Math.min(1, (innerHeight - 144) / 844, (innerWidth - 56) / 390));
    document.documentElement.style.setProperty('--phone-scale', scale);
  }
  function wrap() {
    const root = document.getElementById('dc-root');
    if (!root || root.dataset.juiceboxFramed) return false;
    root.dataset.juiceboxFramed = '1';
    const shell = document.createElement('div'); shell.className = 'juicebox-phone-shell';
    const frame = document.createElement('div'); frame.className = 'juicebox-phone-frame';
    const plane = document.createElement('div'); plane.className = 'juicebox-screen-plane';
    root.before(shell); frame.append(plane); shell.append(frame);
    const screen = document.createElement('iframe');
    screen.title = "Julian's Juicebox app preview";
    screen.style.cssText = 'display:block;border:0;width:100%;height:100%;background:var(--jj-bg)';
    window.JJPhonePreview = screen;
    plane.append(screen);
    root.remove();
    const design = window.JJTheme.design();
    const base = '/mockups/juliansjuicebox/' + design + '/app';
    const roles = document.createElement('nav'); roles.className = 'juicebox-role-switcher'; roles.setAttribute('aria-label', 'Preview role');
    [['owner', 'Owner', base + '/owner'], ['customer', 'Customer', base]].forEach(([id, label, href]) => {
      const link = document.createElement('a'); link.href = href; link.textContent = label;
      if (id === role) link.setAttribute('aria-current', 'page'); roles.append(link);
    });
    shell.prepend(roles);
    screen.addEventListener('load', () => {
      const url = new URL(screen.contentWindow.location.href);
      if (url.origin !== location.origin || !appPath.test(url.pathname)) return;
      // The iframe owns navigation history. Mirror its current address without
      // adding a second history entry, so Back/Forward and copied links work.
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      document.title = screen.contentDocument.title;
      roles.querySelectorAll('a').forEach(link => {
        const active = link.textContent === (url.pathname.includes('/app/owner') ? 'Owner' : 'Customer');
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
    });
    roles.addEventListener('click', event => {
      const link = event.target.closest('a');
      if (!link || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); screen.contentWindow.location.assign(link.href);
    });
    addEventListener('popstate', () => {
      if (screen.contentWindow.location.href !== location.href) screen.contentWindow.location.replace(location.href);
    });
    screen.src = location.href;
    const caption = document.createElement('a'); caption.className = 'juicebox-phone-caption'; caption.href = '/mockups/juliansjuicebox'; caption.textContent = "← All designs · Julian's Juicebox preview"; shell.append(caption);
    fit(); return true;
  }
  addEventListener('resize', fit); fit();
  if (!wrap()) {
    const observer = new MutationObserver(() => { if (wrap()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
