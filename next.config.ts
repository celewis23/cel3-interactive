import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  outputFileTracingIncludes: {
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
    ];
  },
};

export default nextConfig;
