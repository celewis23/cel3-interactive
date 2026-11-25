import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
    "/admin/android": ["./public/downloads/meterwise.apk", "./public/downloads/meterwise-release.json"],
    "/api/admin/android-download": ["./public/downloads/meterwise.apk"],
    "/api/meterwise/android-release": ["./public/downloads/meterwise-release.json"],
    "/admin/meterwise/android": ["./public/downloads/meterwise.apk"],
    "/api/admin/meterwise/android-download": ["./public/downloads/meterwise.apk"],
    "/mockups": ["./app/mockups/access.html", "./app/mockups/directory.html"],
  },
  async redirects() {
    const root = '/mockups/hoopsbasketballacademy/app';
    const oldScreens = ['parent-home', 'messages', 'today', 'workout', 'checkin', 'progress', 'ParentHome.dc.html', 'ParentMessages.dc.html', 'AthleteToday.dc.html', 'AthleteWorkout.dc.html', 'AthleteCheckin.dc.html', 'AthleteProgress.dc.html'];
    return [
      { source: root, destination: root + '/parent', permanent: false },
      ...oldScreens.map(screen => ({ source: root + '/' + screen, destination: root + '/parent', permanent: false })),
    ];
  },
  async rewrites() {
    return [
      { source: "/mockups/index.html", destination: "/mockups" },
      { source: "/mockups/electric-sun-society", destination: "/mockups/electric-sun-society/index.html" },
      { source: "/mockups/neejah-styles", destination: "/mockups/neejah-styles/index.html" },
      { source: "/mockups/secret-squares", destination: "/mockups/secret-squares/index.html" },
      { source: "/mockups/glue-craft-studio", destination: "/mockups/glue-craft-studio/index.html" },
      { source: "/mockups/unlockingrva", destination: "/mockups/unlockingrva/index.html" },
      // Keep the spelling in the client's share link working as well.
      { source: "/mockups/ulockingrva", destination: "/mockups/unlockingrva/index.html" },
      { source: "/mockups/youmatterrva", destination: "/mockups/youmatterrva/index.html" },
      { source: "/mockups/enrich-her-wellness", destination: "/mockups/enrich-her-wellness/index.html" },
      { source: "/mockups/ej-piano", destination: "/mockups/ej-piano/index.html" },
      { source: "/mockups/justbrunchva", destination: "/mockups/justbrunchva/index.html" },
      // Existing photos are served first; missing uploads retain the colored design panel.
      { source: "/mockups/justbrunchva/start-here/images/:image*.jpg", destination: "/mockups/justbrunchva/start-here/images/fallback.svg" },

      // Hoops Basketball Academy — clean entry routes over the raw .dc.html exports.
      { source: "/mockups/hoopsbasketballacademy", destination: "/mockups/hoopsbasketballacademy/index.html" },
      { source: "/mockups/hoopsbasketballacademy/site", destination: "/mockups/hoopsbasketballacademy/site/Main.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/site/about", destination: "/mockups/hoopsbasketballacademy/site/About.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/site/legends", destination: "/mockups/hoopsbasketballacademy/site/Legends.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/site/league", destination: "/mockups/hoopsbasketballacademy/site/League.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/site/request", destination: "/mockups/hoopsbasketballacademy/site/RequestWorkout.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console", destination: "/mockups/hoopsbasketballacademy/console/AdminDashboard.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/requests", destination: "/mockups/hoopsbasketballacademy/console/AdminRequests.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/athletes", destination: "/mockups/hoopsbasketballacademy/console/AdminAthletes.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/drills", destination: "/mockups/hoopsbasketballacademy/console/AdminDrills.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/inbox", destination: "/mockups/hoopsbasketballacademy/console/AdminInbox.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/attendance", destination: "/mockups/hoopsbasketballacademy/console/AdminAttendance.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/billing", destination: "/mockups/hoopsbasketballacademy/console/AdminBilling.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/settings", destination: "/mockups/hoopsbasketballacademy/console/AdminSettings.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/console/site-editor", destination: "/mockups/hoopsbasketballacademy/console/AdminSiteEditor.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/app/coach", destination: "/mockups/hoopsbasketballacademy/app/CoachApp.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/app/parent", destination: "/mockups/hoopsbasketballacademy/app/ParentApp.dc.html" },
      { source: "/mockups/hoopsbasketballacademy/app/athlete", destination: "/mockups/hoopsbasketballacademy/app/AthleteApp.dc.html" },

      // A Woman's Mindset — two concepts (editorial / noir), each with a site + Studio console.
      { source: "/mockups/awomansmindset", destination: "/mockups/awomansmindset/index.html" },
      { source: "/mockups/awomansmindset/editorial", destination: "/mockups/awomansmindset/editorial/Main.dc.html" },
      { source: "/mockups/awomansmindset/editorial/studio", destination: "/mockups/awomansmindset/editorial/studio/Admin.dc.html" },
      { source: "/mockups/awomansmindset/noir", destination: "/mockups/awomansmindset/noir/Noir.dc.html" },
      { source: "/mockups/awomansmindset/noir/studio", destination: "/mockups/awomansmindset/noir/studio/AdminNoir.dc.html" },

      // Julian's Juicebox — three designs (a/b/c), each with site/console/app, over the raw exports.
      { source: "/mockups/juliansjuicebox", destination: "/mockups/juliansjuicebox/Overview.dc.html" },
      { source: "/mockups/juliansjuicebox/a/site", destination: "/mockups/juliansjuicebox/a/site/Main.dc.html" },
      { source: "/mockups/juliansjuicebox/a/site/shop", destination: "/mockups/juliansjuicebox/a/site/ShopA.dc.html" },
      { source: "/mockups/juliansjuicebox/a/site/about", destination: "/mockups/juliansjuicebox/a/site/AboutA.dc.html" },
      { source: "/mockups/juliansjuicebox/a/console", destination: "/mockups/juliansjuicebox/a/console/Admin.dc.html" },
      { source: "/mockups/juliansjuicebox/a/app/owner", destination: "/mockups/juliansjuicebox/a/app/OwnerApp.dc.html" },
      { source: "/mockups/juliansjuicebox/a/app", destination: "/mockups/juliansjuicebox/a/app/AppHome.dc.html" },
      { source: "/mockups/juliansjuicebox/a/app/orders", destination: "/mockups/juliansjuicebox/a/app/AppOrders.dc.html" },
      { source: "/mockups/juliansjuicebox/a/app/bulletins", destination: "/mockups/juliansjuicebox/a/app/AppBulletins.dc.html" },
      { source: "/mockups/juliansjuicebox/b/site", destination: "/mockups/juliansjuicebox/b/site/ConceptB.dc.html" },
      { source: "/mockups/juliansjuicebox/b/site/shop", destination: "/mockups/juliansjuicebox/b/site/Shop.dc.html" },
      { source: "/mockups/juliansjuicebox/b/site/about", destination: "/mockups/juliansjuicebox/b/site/About.dc.html" },
      { source: "/mockups/juliansjuicebox/b/console", destination: "/mockups/juliansjuicebox/b/console/AdminB.dc.html" },
      { source: "/mockups/juliansjuicebox/b/app/owner", destination: "/mockups/juliansjuicebox/b/app/OwnerAppB.dc.html" },
      { source: "/mockups/juliansjuicebox/b/app", destination: "/mockups/juliansjuicebox/b/app/AppHomeB.dc.html" },
      { source: "/mockups/juliansjuicebox/b/app/orders", destination: "/mockups/juliansjuicebox/b/app/AppOrdersB.dc.html" },
      { source: "/mockups/juliansjuicebox/b/app/bulletins", destination: "/mockups/juliansjuicebox/b/app/AppBulletinsB.dc.html" },
      { source: "/mockups/juliansjuicebox/c/site", destination: "/mockups/juliansjuicebox/c/site/ConceptC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/site/shop", destination: "/mockups/juliansjuicebox/c/site/ShopC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/site/about", destination: "/mockups/juliansjuicebox/c/site/AboutC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/console", destination: "/mockups/juliansjuicebox/c/console/AdminC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/app/owner", destination: "/mockups/juliansjuicebox/c/app/OwnerAppC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/app", destination: "/mockups/juliansjuicebox/c/app/AppHomeC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/app/orders", destination: "/mockups/juliansjuicebox/c/app/AppOrdersC.dc.html" },
      { source: "/mockups/juliansjuicebox/c/app/bulletins", destination: "/mockups/juliansjuicebox/c/app/AppBulletinsC.dc.html" },

      // Owner-app and customer-app screens added to complete both apps: one shared file per
      // screen under _apps/, rewritten for all three designs (design is read from the URL by
      // the component at runtime, since the same physical file serves a/b/c).
      ...["a", "b", "c"].flatMap((d) => [
        ["app/owner/orders", "OwnerOrders"],
        ["app/owner/orders/detail", "OwnerOrderDetail"],
        ["app/owner/inbox", "OwnerInbox"],
        ["app/owner/inbox/thread", "OwnerInboxThread"],
        ["app/owner/inbox/compose", "OwnerCompose"],
        ["app/owner/site", "OwnerSite"],
        ["app/owner/site/media", "OwnerSiteMedia"],
        ["app/owner/site/upload", "OwnerSiteUpload"],
        ["app/owner/more", "OwnerMore"],
        ["app/owner/more/products", "OwnerProducts"],
        ["app/owner/more/products/edit", "OwnerProduct"],
        ["app/owner/more/inventory", "OwnerInventory"],
        ["app/owner/more/inventory/adjust", "OwnerInventoryAdjust"],
        ["app/owner/more/inventory/batch", "OwnerInventoryBatch"],
        ["app/owner/more/customers", "OwnerCustomers"],
        ["app/owner/more/customers/detail", "OwnerCustomer"],
        ["app/owner/more/subscriptions", "OwnerSubscriptions"],
        ["app/owner/more/discounts", "OwnerDiscounts"],
        ["app/owner/more/discounts/new", "OwnerDiscountNew"],
        ["app/owner/more/bulletins", "OwnerBulletins"],
        ["app/owner/more/bulletins/new", "OwnerBulletinNew"],
        ["app/owner/more/bulletins/sent", "OwnerBulletinSent"],
        ["app/owner/more/carts", "OwnerCarts"],
        ["app/owner/more/reviews", "OwnerReviews"],
        ["app/owner/more/analytics", "OwnerAnalytics"],
        ["app/owner/more/notifications", "OwnerNotifications"],
        ["app/owner/more/settings", "OwnerSettings"],
        ["app/product", "AppProduct"],
        ["app/box", "AppBox"],
        ["app/checkout", "AppCheckout"],
        ["app/orders/detail", "AppOrderDetail"],
        ["app/guide", "AppGuide"],
        ["app/subscription", "AppSubscription"],
        ["app/bulletins/detail", "AppBulletinDetail"],
        ["app/account", "AppAccount"],
        ["app/welcome", "AppWelcome"],
        ["app/signin", "AppSignIn"],
        ["app/notifications-permission", "AppNotificationsPermission"],
      ].map(([route, file]) => ({
        source: `/mockups/juliansjuicebox/${d}/${route}`,
        destination: `/mockups/juliansjuicebox/_apps/${file}.dc.html`,
      }))),
    ];
  },
  async headers() {
    return [
      {
        // Spotlight videos show minors; keep this proposal out of search indexes.
        source: "/mockups/ej-piano/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        // Client preview + live proposal/checkout — keep out of search indexes.
        source: "/mockups/hoopsbasketballacademy/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        // Client preview + live proposal/checkout — keep out of search indexes.
        source: "/mockups/juliansjuicebox/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        // Client preview + live proposal/checkout — keep out of search indexes.
        source: "/mockups/awomansmindset/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        // Personal in-progress rally planner/scouting app — keep out of search indexes.
        source: "/mockups/riversiderally/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
};

export default nextConfig;
