(() => {
  'use strict';
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
    root.before(shell); plane.append(root); frame.append(plane); shell.append(frame);
    const design = window.JJTheme.design();
    const base = '/mockups/juliansjuicebox/' + design + '/app';
    const roles = document.createElement('nav'); roles.className = 'juicebox-role-switcher'; roles.setAttribute('aria-label', 'Preview role');
    [['owner', 'Owner', base + '/owner'], ['customer', 'Customer', base]].forEach(([id, label, href]) => {
      const link = document.createElement('a'); link.href = href; link.textContent = label;
      if (id === role) link.setAttribute('aria-current', 'page'); roles.append(link);
    });
    shell.prepend(roles);
    const caption = document.createElement('a'); caption.className = 'juicebox-phone-caption'; caption.href = '/mockups/juliansjuicebox'; caption.textContent = "← All designs · Julian's Juicebox preview"; shell.append(caption);
    fit(); return true;
  }
  addEventListener('resize', fit); fit();
  if (!wrap()) {
    const observer = new MutationObserver(() => { if (wrap()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
