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
      radiusCard: "16px", radiusBtn: "8px", radiusPill: "999px",
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
      border: "none", borderLight: "1px solid #c9d2c4",
      avatarColors: ["#1f5c2c", "#f6c744", "#7a1f3d", "#2f7d32"],
    },
    c: {
      design: "c", ink: "#17140f", bg: "#ffffff", surface: "#fff3c4", accentSoft: "#fff3c4",
      accent: "#8c1c4a", accentDark: "#5a1230", cta: "#ffd23f", ctaText: "#17140f", gold: "#ffd23f",
      muted: "#55504a", line: "#e3e5dd", danger: "#8c1c4a",
      displayFont: "'Unbounded', sans-serif", bodyFont: "'DM Sans', sans-serif",
      displayWeight: "700", displayTransform: "uppercase", displayTracking: "-0.01em",
      radiusCard: "24px", radiusBtn: "999px", radiusPill: "999px",
      border: "3px solid #17140f", borderLight: "1px solid #a9aba2",
      avatarColors: ["#8c1c4a", "#ffd23f", "#2f7d32", "#5a1230"],
    },
  };

  function buildTheme(design) {
    var t = TOKENS[design];
    var card = "background:" + t.surface + ";border:" + t.border + ";border-radius:" + t.radiusCard + ";padding:18px";
    var cardFlat = "background:" + t.surface + ";border-radius:" + t.radiusCard + ";padding:18px";
    var head = "font-family:" + t.displayFont + ";font-weight:" + t.displayWeight + ";text-transform:" + t.displayTransform + ";letter-spacing:" + t.displayTracking + ";line-height:1";
    var btnBase = "display:flex;align-items:center;justify-content:center;min-height:48px;border:0;font:inherit;font-weight:700;cursor:pointer;border-radius:" + t.radiusBtn;
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
    } catch (e) {
      return Object.assign({}, STATE_DEFAULTS);
    }
  }

  function saveState(design, patch) {
    var current = loadState(design);
    var next = Object.assign({}, current, patch);
    try { window.sessionStorage.setItem(stateKey(design), JSON.stringify(next)); } catch (e) { /* ignore */ }
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
    ], activeKey);
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

  window.JJKit = { ownerTabs: ownerTabs, customerTabs: customerTabs };
})();
