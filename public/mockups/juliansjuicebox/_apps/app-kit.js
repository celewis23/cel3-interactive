(() => {
  "use strict";

  // ─── Design detection ──────────────────────────────────────────────────
  // These screens are single shared files served at three different clean
  // URLs (one per design) via next.config.ts rewrites, so the design can't
  // be baked into the file — it's read from the URL that's actually showing.
  function detectDesign() {
    var m = /\/mockups\/juliansjuicebox\/(a|b|c)\//.exec(location.pathname);
    return m ? m[1] : "a";
  }

  // ─── Theme tokens, matched to each design's existing screens ──────────
  var FONTS = {
    a: { display: "Barlow+Condensed:wght@500;600;700;800", body: "Barlow:wght@400;500;600;700" },
    b: { display: "Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800", body: "Figtree:wght@400;500;600;700" },
    c: { display: "Unbounded:wght@500;700;900", body: "DM+Sans:wght@400;500;600;700" },
  };

  var TOKENS = {
    a: {
      design: "a", ink: "#1c1c1a", bg: "#f3f6ee", surface: "#ffffff", accentSoft: "#eaf3e6",
      accent: "#2e6b2a", accentDark: "#163d15", cta: "#e0901a", ctaText: "#1c1c1a", gold: "#f2c230",
      muted: "#55554f", line: "#e3e5dd", danger: "#b0391f",
      displayFont: "'Barlow Condensed', sans-serif", bodyFont: "'Barlow', sans-serif",
      displayWeight: "800", displayTransform: "uppercase", displayTracking: "0.01em",
      radiusCard: "14px", radiusBtn: "8px", radiusPill: "999px",
      headerSize: "32px", tabSize: "16px", headerTile: "#3a3a36", pageSoft: "#f3f6ee",
      border: "2px solid #1c1c1a", borderLight: "1px solid #a9aba2",
      avatarColors: ["#2e6b2a", "#e0901a", "#7a1f3d", "#2f7d32"],
    },
    b: {
      design: "b", ink: "#14261a", bg: "#ffffff", surface: "#f6f7f4", accentSoft: "#eaf2dc",
      accent: "#1f5c2c", accentDark: "#123a1b", cta: "#f6c744", ctaText: "#14261a", gold: "#f6c744",
      muted: "#4a5a4e", line: "#e3e5dd", danger: "#b0391f",
      displayFont: "'Bricolage Grotesque', sans-serif", bodyFont: "'Figtree', sans-serif",
      displayWeight: "800", displayTransform: "none", displayTracking: "-0.02em",
      radiusCard: "22px", radiusBtn: "999px", radiusPill: "999px",
      headerSize: "28.2px", tabSize: "14.1px", headerTile: "#1f5c2c", pageSoft: "#f6f7f4",
      border: "none", borderLight: "1px solid #c9d2c4",
      avatarColors: ["#1f5c2c", "#f6c744", "#7a1f3d", "#2f7d32"],
    },
    c: {
      design: "c", ink: "#17140f", bg: "#ffffff", surface: "#ffffff", accentSoft: "#fff3c4",
      accent: "#8c1c4a", accentDark: "#5a1230", cta: "#ffd23f", ctaText: "#17140f", gold: "#ffd23f",
      muted: "#55504a", line: "#e3e5dd", danger: "#8c1c4a",
      displayFont: "'Unbounded', sans-serif", bodyFont: "'DM Sans', sans-serif",
      displayWeight: "700", displayTransform: "uppercase", displayTracking: "-0.01em",
      radiusCard: "20px", radiusBtn: "999px", radiusPill: "999px",
      headerSize: "21.8px", tabSize: "11px", headerTile: "#3a352c", pageSoft: "#fff8dc",
      border: "3px solid #17140f", borderLight: "1px solid #a9aba2",
      avatarColors: ["#8c1c4a", "#ffd23f", "#2f7d32", "#5a1230"],
    },
  };

  function buildTheme(design) {
    var t = TOKENS[design];
    t.white = "#ffffff";
    t.palette = {"color234f22": "#234f22", "colorb54e08": "#b54e08", "color7a1f3d": "#7a1f3d", "color8a6400": "#8a6400", "color2f7d32": "#2f7d32"};
    t.radiusSmall = "8px";
    t.buttonSize = design === 'c' ? '11px' : design === 'b' ? '14px' : '16px';
    t.scrollThumb = t.ink + "59";
    var card = "background:" + t.surface + ";border:" + t.border + ";border-radius:" + t.radiusCard + ";padding:18px";
    var cardFlat = "background:" + t.surface + ";border-radius:" + t.radiusCard + ";padding:18px";
    var head = "font-family:" + t.displayFont + ";font-weight:" + t.displayWeight + ";text-transform:" + t.displayTransform + ";letter-spacing:" + t.displayTracking + ";line-height:1";
    var btnBase = "display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 18px;border:0;font-family:" + t.displayFont + ";font-size:" + (design === 'c' ? '11px' : design === 'b' ? '14px' : '16px') + ";text-transform:" + t.displayTransform + ";font-weight:700;white-space:nowrap;cursor:pointer;border-radius:" + t.radiusBtn;
    var btnPrimary = btnBase + ";background:" + t.accent + ";color:#ffffff";
    var btnCta = btnBase + ";background:" + t.cta + ";color:" + t.ctaText;
    var btnGhost = btnBase + ";background:" + t.surface + ";color:" + t.ink + ";border:" + t.borderLight;
    var input = "min-height:46px;padding:0 14px;border:" + t.borderLight + ";border-radius:" + (design === "b" ? "12px" : "10px") + ";font:inherit;width:100%";
    var headerBar = "display:flex;align-items:center;gap:12px;padding:16px 18px;border-bottom:" + t.borderLight + ";background:" + t.surface;
    var backBtn = "flex:none;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:" + t.bg + ";color:" + t.ink + ";text-decoration:none";
    var tabBar = "display:grid;border-top:" + t.borderLight + ";padding:6px 6px calc(6px + env(safe-area-inset-bottom, 0px));background:" + t.surface + ";font-family:" + t.bodyFont + ";font-weight:700;font-size:11px";
    return Object.assign({}, t, {
      card: card, cardFlat: cardFlat, head: head, btnPrimary: btnPrimary, btnCta: btnCta, btnGhost: btnGhost,
      input: input, headerBar: headerBar, backBtn: backBtn, tabBar: tabBar,
      fontsHref: "https://fonts.googleapis.com/css2?family=" + FONTS[design].display + "&family=" + FONTS[design].body + "&display=swap",
    });
  }

  var JJTheme = {
    current: function () { return buildTheme(detectDesign()); },
    design: detectDesign,
    forDesign: buildTheme,
  };

  // ─── Session state, one bucket per design ──────────────────────────────
  var STATE_DEFAULTS = {
    seenWelcome: false,
    signedIn: false,
    notifPermission: "unset",
    packedOrders: {},
    sentBulletins: [],
    placedOrders: [],
    readBulletins: {},
    subscription: { status: "active", nextDate: "Dec 9" },
  };

  function stateKey(design) { return "juicebox.app." + design; }

  function loadState(design) {
    try {
      var raw = window.sessionStorage.getItem(stateKey(design));
      var parsed = raw ? JSON.parse(raw) : {};
      return Object.assign({}, STATE_DEFAULTS, parsed, {
        packedOrders: Object.assign({}, STATE_DEFAULTS.packedOrders, parsed.packedOrders),
        readBulletins: Object.assign({}, STATE_DEFAULTS.readBulletins, parsed.readBulletins),
        subscription: Object.assign({}, STATE_DEFAULTS.subscription, parsed.subscription),
        sentBulletins: parsed.sentBulletins || [],
        placedOrders: parsed.placedOrders || [],
      });
    } catch {
      return Object.assign({}, STATE_DEFAULTS);
    }
  }

  function saveState(design, patch) {
    var current = loadState(design);
    var next = Object.assign({}, current, patch);
    try { window.sessionStorage.setItem(stateKey(design), JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  }

  window.JJTheme = JJTheme;
  window.JJAppState = { load: loadState, save: saveState };

  // ─── Tab bar data (icons as SVG path "d" strings, matching the existing
  // AdminNav/SiteNav convention in this codebase) ─────────────────────────
  var ICONS = {
    today: "M3 11l9-7 9 7v9H3z",
    orders: "M4 6h16M4 12h10M4 18h7",
    inbox: "M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z",
    site: "M3 4h18v13H3zM8 21h8M12 17v4",
    more: "M5 12h.01M12 12h.01M19 12h.01",
    order: "M9 2 3 7v13h18V7l-6-5zM3 7h18",
    myorders: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    bulletins: "M4 4h16v12H8l-4 4z",
    account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6",
  };

  function tabs(design, items, activeKey) {
    var t = TOKENS[design];
    return items.map(function (it) {
      var on = it.key === activeKey;
      return {
        key: it.key, label: it.label, href: it.href, d: ICONS[it.key] || "",
        badge: it.badge || "", hasBadge: !!it.badge,
        on: on, bg: on ? t.ink : "transparent", fg: on ? "#ffffff" : t.muted,
      };
    });
  }

  function ownerTabs(design, activeKey) {
    var base = "/mockups/juliansjuicebox/" + design + "/app/owner";
    return tabs(design, [
      { key: "today", label: "Today", href: base },
      { key: "orders", label: "Orders", href: base + "/orders" },
      { key: "inbox", label: "Inbox", href: base + "/inbox" },
      { key: "site", label: "Site", href: base + "/site" },
      { key: "more", label: "More", href: base + "/more" },
    ], activeKey).map(function (tab) {
      if (tab.on) { tab.bg = TOKENS[design].gold; tab.fg = TOKENS[design].ink; }
      return tab;
    });
  }

  function customerTabs(design, activeKey, bulletinBadge) {
    var base = "/mockups/juliansjuicebox/" + design + "/app";
    return tabs(design, [
      { key: "order", label: "Order", href: base },
      { key: "myorders", label: "My orders", href: base + "/orders" },
      { key: "bulletins", label: "Bulletins", href: base + "/bulletins", badge: bulletinBadge },
      { key: "account", label: "Account", href: base + "/account" },
    ], activeKey);
  }

  var TITLES = {
    '': 'Order', orders: 'My orders', 'orders/detail': 'Order details', bulletins: 'Bulletins', 'bulletins/detail': 'Bulletin',
    product: 'Juicebox', box: 'Your box', checkout: 'Checkout', guide: 'Cleanse guide', subscription: 'Subscription',
    account: 'Account', welcome: 'Welcome', signin: 'Sign in', 'notifications-permission': 'Notifications',
    owner: 'Good morning, Julian', 'owner/orders': 'Orders', 'owner/orders/detail': 'Order details',
    'owner/inbox': 'Inbox', 'owner/inbox/thread': 'Email', 'owner/inbox/compose': 'Compose',
    'owner/site': 'Site', 'owner/site/media': 'Media library', 'owner/site/upload': 'Upload',
    'owner/more': 'More', 'owner/more/products': 'Products', 'owner/more/products/edit': 'Edit product',
    'owner/more/inventory': 'Inventory', 'owner/more/inventory/adjust': 'Adjust stock', 'owner/more/inventory/batch': 'Add batch',
    'owner/more/customers': 'Customers', 'owner/more/customers/detail': 'Customer', 'owner/more/subscriptions': 'Subscriptions',
    'owner/more/discounts': 'Discount codes', 'owner/more/discounts/new': 'New discount',
    'owner/more/bulletins': 'Bulletins sent', 'owner/more/bulletins/new': 'New bulletin', 'owner/more/bulletins/sent': 'Bulletin sent',
    'owner/more/carts': 'Abandoned carts', 'owner/more/reviews': 'Reviews', 'owner/more/analytics': 'Analytics',
    'owner/more/notifications': 'Notifications', 'owner/more/settings': 'Store settings',
  };
  function screenChrome(values) {
    var theme = JJTheme.current(), design = theme.design;
    var route = (location.pathname.split('/app')[1] || '').replace(/^\//, '').replace(/\/$/, '');
    var owner = route === 'owner' || route.indexOf('owner/') === 0;
    var base = '/mockups/juliansjuicebox/' + design + '/app';
    var tabRoots = owner ? ['owner', 'owner/orders', 'owner/inbox', 'owner/site', 'owner/more'] : ['', 'orders', 'bulletins', 'account'];
    var active = owner ? (route.split('/')[1] || 'today') : (route.split('/')[0] || 'order');
    if (!owner && active === 'orders') active = 'myorders';
    if (owner && !['today', 'orders', 'inbox', 'site', 'more'].includes(active)) active = 'more';
    if (!owner && !['order', 'myorders', 'bulletins', 'account'].includes(active)) active = ['subscription', 'guide', 'signin', 'welcome', 'notifications-permission'].includes(route) ? 'account' : 'order';
    var rootTab = tabRoots.includes(route);
    var back = values.back || base + (route.includes('/') ? '/' + route.slice(0, route.lastIndexOf('/')) : '');
    var action = route === 'owner/inbox' ? base + '/owner/inbox/compose' : route === 'owner/site' ? '/mockups/juliansjuicebox/' + design + '/site' : route === '' ? base + '/box' : '';
    var actionLabel = route === 'owner/inbox' ? 'Compose email' : route === 'owner/site' ? 'View site' : 'Your box';
    var collection = ['orders', 'threads', 'products', 'customers', 'items', 'rows', 'tiles', 'notifs', 'reviews', 'pages'].map(function (k) { return Array.isArray(values[k]) ? values[k] : null; }).find(function (list) { return list !== null; });
    var count = collection ? collection.length : null;
    return {
      theme: theme, screenRole: owner ? 'owner' : 'customer', screenTitle: TITLES[route] || 'Juicebox',
      screenEyebrow: owner ? "Julian's Juicebox · Owner" : "Julian's Juicebox",
      screenHasBack: !rootTab, screenBack: back, screenAction: !!action, screenActionHref: action,
      screenActionLabel: actionLabel, screenActionText: route === 'owner/inbox' ? '✎' : route === 'owner/site' ? '↗' : 'Box · ' + (values.boxCount || 0),
      screenTabs: owner ? ownerTabs(design, active) : customerTabs(design, active, 0),
      screenSummary: count !== null ? count + (route === 'owner/inbox' ? ' emails' : ' items') : 'Preview · sample data',
      screenEmpty: count === 0,
      screenTip: (count === null || count < 4) && route !== 'owner/site' && !['', 'owner', 'owner/inbox/thread', 'bulletins/detail', 'orders/detail'].includes(route)
        ? (route.includes('compose') ? 'Preview only — no email is sent.' : owner ? 'Use the tabs below to return to Orders, Inbox or Site.' : 'Use the tabs below to return to Order, My orders or Account.') : '',
      screenOverview: '/mockups/juliansjuicebox',
    };
  }
  // Every exported screen uses this same React-backed header/content/tab layout.
  function AppScreen(Base) {
    return class extends Base {
      renderVals() {
        var values = this.screenVals();
        return Object.assign({}, values, screenChrome(values));
      }
    };
  }
  window.JJKit = { ownerTabs: ownerTabs, customerTabs: customerTabs, AppScreen: AppScreen };

  if (typeof document !== 'undefined' && document.head && document.documentElement.style) {
    var theme = JJTheme.current();
    var cssVars = { ink: theme.ink, bg: theme.bg, surface: theme.surface, tint: theme.accentSoft, accent: theme.accent, white: theme.white,
      cta: theme.cta, gold: theme.gold, muted: theme.muted, line: theme.line, danger: theme.danger,
      'header-tile': theme.headerTile, 'page-soft': theme.pageSoft, display: theme.displayFont, body: theme.bodyFont,
      'display-size': theme.headerSize, 'display-weight': theme.displayWeight, 'display-case': theme.displayTransform,
      'tab-size': theme.tabSize, 'card-radius': theme.radiusCard, 'button-radius': theme.radiusBtn, 'small-radius': theme.radiusSmall,
      'button-size': theme.buttonSize,
      'card-border': theme.border, 'light-border': theme.borderLight, 'scroll-thumb': theme.scrollThumb };
    Object.keys(cssVars).forEach(function (k) { document.documentElement.style.setProperty('--jj-' + k, cssVars[k]); });
    document.documentElement.dataset.juiceboxDesign = theme.design;
    var fonts = document.createElement('link'); fonts.rel = 'stylesheet'; fonts.href = theme.fontsHref;
    window.JJFontsReady = new Promise(function (resolve) {
      fonts.onload = function () {
        Promise.all([
          document.fonts.load('400 16px ' + theme.bodyFont),
          document.fonts.load('700 16px ' + theme.bodyFont),
          document.fonts.load(theme.displayWeight + ' 24px ' + theme.displayFont),
        ]).then(function () { resolve(true); }, function () { resolve(false); });
      };
      fonts.onerror = function () { resolve(false); };
    });
    document.head.appendChild(fonts);
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/mockups/juliansjuicebox/_apps/app-screen.css'; document.head.appendChild(css);
    document.addEventListener('scroll', function (event) {
      var el = event.target;
      if (!el.classList?.contains('jj-app-content')) return;
      el.classList.add('is-scrolling'); clearTimeout(el._scrollIdle);
      el._scrollIdle = setTimeout(function () { el.classList.remove('is-scrolling'); }, 800);
    }, true);
    var drag;
    document.addEventListener('pointerdown', function (event) {
      var row = event.target.closest?.('.jj-chips');
      if (row && event.pointerType === 'mouse') drag = { row: row, x: event.clientX, left: row.scrollLeft, moved: false };
    });
    document.addEventListener('pointermove', function (event) {
      if (!drag) return;
      var delta = event.clientX - drag.x;
      if (Math.abs(delta) > 6) { drag.moved = true; drag.row.scrollLeft = drag.left - delta; }
    });
    document.addEventListener('pointerup', function () {
      if (drag?.moved) {
        var stopClick = function (event) { event.preventDefault(); event.stopPropagation(); };
        document.addEventListener('click', stopClick, { capture: true, once: true });
        setTimeout(function () { document.removeEventListener('click', stopClick, true); }, 0);
      }
      drag = null;
    });
  }
})();
