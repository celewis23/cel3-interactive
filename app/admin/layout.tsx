"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import LiveTimer from "@/components/admin/time/LiveTimer";
import AIAssistant from "@/components/admin/ai/AIAssistant";
import AdminNotificationManager from "@/components/admin/notifications/AdminNotificationManager";

const TEAM_NAV = {
  label: "Team",
  href: "/admin/announcements",
  icon: (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
};

interface CurrentUser {
  name: string;
  email: string;
  roleName: string;
  isOwner: boolean;
}

const NAV = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Projects",
    href: "/admin/projects",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
  },
  {
    label: "Pipeline",
    href: "/admin/pipeline",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0l-3.75-3.75M17.25 21L21 17.25" />
      </svg>
    ),
  },
  {
    label: "Estimates",
    href: "/admin/estimates",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    label: "Email",
    href: "/admin/email",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    label: "Drive",
    href: "/admin/drive",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    label: "Photos",
    href: "/admin/photos",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    label: "Calendar",
    href: "/admin/calendar",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V9.75zm0 3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm2.25-6h.008v.008H14.25V9.75zm0 3h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zm2.25-6h.008v.008H16.5V9.75zm0 3h.008v.008H16.5v-.008zm0 3h.008v.008H16.5v-.008zm-6.75-6h.008v.008H9.75V9.75zm0 3h.008v.008H9.75v-.008zm0 3h.008v.008H9.75v-.008zm-2.25 6h.008v.008H7.5v-.008zm0-3h.008v.008H7.5V15zm0-3h.008v.008H7.5V12z" />
      </svg>
    ),
  },
  {
    label: "Meet",
    href: "/admin/meet",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    label: "Chat",
    href: "/admin/chat",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
  },
  {
    label: "Contacts",
    href: "/admin/contacts",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Case Studies",
    href: "/admin/case-studies",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    label: "Site Content",
    href: "/admin/content",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    label: "Portal Users",
    href: "/admin/portal-users",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    label: "Client Requests",
    href: "/admin/portal-requests",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h5.25m-8.25 8.25h15A2.25 2.25 0 0 0 21 17.25V6.75A2.25 2.25 0 0 0 18.75 4.5H5.25A2.25 2.25 0 0 0 3 6.75v10.5A2.25 2.25 0 0 0 5.25 19.5Zm0 0-2.25 2.25" />
      </svg>
    ),
  },
  {
    label: "Staff",
    href: "/admin/staff",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Onboarding",
    href: "/admin/onboarding",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    label: "Time",
    href: "/admin/time",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    label: "Expenses",
    href: "/admin/expenses",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    label: "Contracts",
    href: "/admin/contracts",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
      </svg>
    ),
  },
  {
    label: "Billing",
    href: "/admin/billing",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 21z" />
      </svg>
    ),
  },
  {
    label: "Forms",
    href: "/admin/forms",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    label: "Integrations",
    href: "/admin/integrations",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    label: "Automations",
    href: "/admin/automations",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    label: "Assets",
    href: "/admin/assets",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    label: "Audit Log",
    href: "/admin/audit",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
  {
    label: "Bookings",
    href: "/admin/bookings",
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setCurrentUser({ name: d.name, email: d.email, roleName: d.roleName, isOwner: d.isOwner });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("cel3-admin-theme");
    const nextTheme = stored === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-admin-theme", nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-admin-theme", theme);
    window.localStorage.setItem("cel3-admin-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/admin/email/status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnreadCount(data.unreadCount ?? 0);
      } catch { /* ignore */ }
    }
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchUnreadAnnouncements() {
      try {
        const res = await fetch("/api/admin/announcements/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUnreadAnnouncements(data.count ?? 0);
      } catch { /* ignore */ }
    }
    fetchUnreadAnnouncements();
    const id = setInterval(fetchUnreadAnnouncements, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Don't render shell on login/pin pages
  if (pathname.startsWith("/admin/login") || pathname.startsWith("/admin/pin")) {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  const initials = (currentUser?.name || currentUser?.email || "Admin")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";
  const shellClass = theme === "light"
    ? "min-h-screen bg-[#f1efea] text-[#111111] flex"
    : "min-h-screen bg-black text-white flex";
  const sidebarClass = theme === "light"
    ? "hidden lg:flex flex-col w-56 bg-[#f6f4ef] border-r border-black/8 flex-shrink-0"
    : "hidden lg:flex flex-col w-56 bg-[#0a0a0a] border-r border-white/8 flex-shrink-0";
  const desktopTopbarClass = theme === "light"
    ? "hidden lg:flex items-center justify-between px-8 h-16 border-b border-black/8 bg-[#f8f6f1]/95 backdrop-blur-sm flex-shrink-0"
    : "hidden lg:flex items-center justify-between px-8 h-16 border-b border-white/8 bg-[#0a0a0a]/95 backdrop-blur-sm flex-shrink-0";
  const mobileHeaderClass = theme === "light"
    ? "lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-black/8 flex-shrink-0 bg-[#f8f6f1]"
    : "lg:hidden flex items-center justify-between px-5 py-3.5 border-b border-white/8 flex-shrink-0 bg-[#0a0a0a]";
  const iconButtonClass = theme === "light"
    ? "w-10 h-10 rounded-full border border-black/10 bg-white/70 text-[#111111] hover:bg-white transition-colors flex items-center justify-center"
    : "w-10 h-10 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors flex items-center justify-center";
  const menuClass = theme === "light"
    ? "absolute right-0 top-full mt-3 w-80 rounded-2xl border border-black/10 bg-white/95 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl overflow-hidden"
    : "absolute right-0 top-full mt-3 w-80 rounded-2xl border border-white/10 bg-[#101010]/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl overflow-hidden";
  const accountRowClass = theme === "light"
    ? "flex items-center gap-3 px-4 py-3 text-sm text-[#111111] hover:bg-black/5 transition-colors"
    : "flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-white/5 transition-colors";
  const shellMutedClass = theme === "light" ? "text-black/45" : "text-white/35";
  const mainClass = theme === "light"
    ? "flex-1 p-4 pb-28 lg:p-8 max-w-6xl w-full mx-auto"
    : "flex-1 p-4 pb-28 lg:p-8 max-w-6xl w-full mx-auto";
  const bottomBarClass = theme === "light"
    ? "lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#f8f6f1]/95 backdrop-blur-md border-t border-black/8 flex items-stretch"
    : "lg:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/8 flex items-stretch";
  const moreSheetClass = theme === "light"
    ? `fixed bottom-0 inset-x-0 z-50 bg-[#f8f6f1] rounded-t-2xl border-t border-black/10 lg:hidden flex flex-col transition-transform duration-300 ease-out max-h-[85dvh] ${
        moreOpen ? "translate-y-0" : "translate-y-full"
      }`
    : `fixed bottom-0 inset-x-0 z-50 bg-[#0f0f0f] rounded-t-2xl border-t border-white/10 lg:hidden flex flex-col transition-transform duration-300 ease-out max-h-[85dvh] ${
        moreOpen ? "translate-y-0" : "translate-y-full"
      }`;

  return (
    <div className={shellClass}>
      {/* Sidebar — desktop only */}
      <aside className={sidebarClass}>
        {/* Logo */}
        <div className={`px-5 py-5 ${theme === "light" ? "border-b border-black/8" : "border-b border-white/8"}`}>
          <div className="text-xs tracking-widest uppercase text-sky-400 mb-0.5">Backoffice</div>
          <div className={`text-sm font-semibold ${theme === "light" ? "text-[#111111]" : "text-white"}`}>CEL3 Interactive</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {[...NAV, TEAM_NAV].map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href.split("?")[0]);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-sky-500/10 text-sky-400"
                    : theme === "light"
                      ? "text-black/55 hover:text-black hover:bg-black/5"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.label === "Email" && unreadCount > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-semibold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {item.label === "Team" && unreadAnnouncements > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-semibold leading-none">
                    {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Live Timer */}
        <div className={theme === "light" ? "border-t border-black/8" : "border-t border-white/8"}>
          <LiveTimer />
        </div>

        {/* Footer */}
        <div className={`px-3 py-4 ${theme === "light" ? "border-t border-black/8" : "border-t border-white/8"}`}>
          {/* Current user identity */}
          {currentUser && (
            <div className="px-3 py-2 mb-2">
              <div className={`text-xs font-medium truncate ${theme === "light" ? "text-black/75" : "text-white/70"}`}>{currentUser.name}</div>
              <div className={`text-[10px] mt-0.5 truncate ${theme === "light" ? "text-black/40" : "text-white/30"}`}>{currentUser.email}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full ${
              theme === "light" ? "text-black/50 hover:text-black hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign out
          </button>
          <Link
            href="/"
            target="_blank"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
              theme === "light" ? "text-black/50 hover:text-black hover:bg-black/5" : "text-white/40 hover:text-white hover:bg-white/5"
            }`}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            View site
          </Link>
        </div>
      </aside>

      {/* More sheet backdrop — mobile only */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet — slides up from bottom on mobile */}
      <div
        className={moreSheetClass}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className={`w-9 h-1 rounded-full ${theme === "light" ? "bg-black/20" : "bg-white/20"}`} />
        </div>

        {/* All nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {[...NAV, TEAM_NAV].map((item) => {
            const isActive = item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href.split("?")[0]);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sky-500/10 text-sky-400"
                    : theme === "light"
                      ? "text-black/70"
                      : "text-white/70"
                }`}
              >
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {item.label === "Email" && unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-semibold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {item.label === "Team" && unreadAnnouncements > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-semibold leading-none">
                    {unreadAnnouncements > 99 ? "99+" : unreadAnnouncements}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User + actions footer */}
        <div className={`flex-shrink-0 px-4 py-3 pb-8 ${theme === "light" ? "border-t border-black/8" : "border-t border-white/8"}`}>
          {currentUser && (
            <div className="px-4 py-2 mb-1">
              <div className={`text-sm font-medium ${theme === "light" ? "text-[#111111]" : "text-white"}`}>{currentUser.name}</div>
              <div className={`text-xs mt-0.5 ${theme === "light" ? "text-black/40" : "text-white/40"}`}>{currentUser.email}</div>
            </div>
          )}
          <button
            onClick={() => { setMoreOpen(false); handleLogout(); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm w-full ${
              theme === "light" ? "text-black/60" : "text-white/60"
            }`}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Sign out
          </button>
          <Link
            href="/"
            target="_blank"
            onClick={() => setMoreOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
              theme === "light" ? "text-black/60" : "text-white/60"
            }`}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            View site
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className={desktopTopbarClass}>
          <div>
            <div className="text-xs tracking-[0.28em] uppercase font-semibold text-sky-400">
              {[...NAV, TEAM_NAV].find((n) =>
                n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href.split("?")[0])
              )?.label ?? "Backoffice"}
            </div>
            <div className={`text-sm mt-0.5 ${shellMutedClass}`}>
              Premium controls for your workspace, account, and theme.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser?.email && (
              <span className={`hidden xl:block text-sm max-w-[260px] truncate ${shellMutedClass}`}>
                {currentUser.email}
              </span>
            )}
            <button
              type="button"
              onClick={() => setTheme((prev) => prev === "dark" ? "light" : "dark")}
              className={iconButtonClass}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.364 6.364-1.06-1.06M6.697 6.697 5.636 5.636m12.728 0-1.06 1.061M6.697 17.303l-1.061 1.06M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0Z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3c-.008.116-.01.233-.01.35A7.5 7.5 0 0018.65 10.8c.117 0 .234-.002.35-.01Z" />
                </svg>
              )}
            </button>
            <div
              ref={menuRef}
              className="relative"
              onMouseEnter={() => setMenuOpen(true)}
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`${iconButtonClass} overflow-hidden`}
                aria-label="Open account menu"
              >
                <span className="w-full h-full flex items-center justify-center rounded-full bg-sky-500/15 text-sky-400 font-semibold text-sm">
                  {initials}
                </span>
              </button>
              {menuOpen && (
                <div className={menuClass}>
                  <div className={`px-4 py-4 border-b ${theme === "light" ? "border-black/8" : "border-white/8"}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-sky-500/15 text-sky-400 font-semibold flex items-center justify-center">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${theme === "light" ? "text-[#111111]" : "text-white"}`}>
                          {currentUser?.name ?? "Admin Account"}
                        </p>
                        <p className={`text-xs truncate ${shellMutedClass}`}>{currentUser?.email ?? "Loading account"}</p>
                        <p className={`text-[11px] truncate mt-1 ${shellMutedClass}`}>{currentUser?.roleName ?? "Workspace access"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-2">
                    <Link href="/admin/settings" className={accountRowClass}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0Zm7.5-3v3l2.25 2.25" />
                      </svg>
                      <span>Settings</span>
                    </Link>
                    <Link href="/admin/privacy" className={accountRowClass}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 9h10.5A2.25 2.25 0 0019.5 17.25v-4.5A2.25 2.25 0 0017.25 10.5H6.75A2.25 2.25 0 004.5 12.75v4.5A2.25 2.25 0 006.75 19.5Z" />
                      </svg>
                      <span>Privacy</span>
                    </Link>
                    <div className={`px-4 pt-2 pb-1 text-xs ${shellMutedClass}`}>
                      Signed in as {currentUser?.email ?? "your admin account"}
                    </div>
                    <div className={`px-4 py-3 border-t mt-2 ${theme === "light" ? "border-black/8" : "border-white/8"}`}>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 text-left text-sm transition-colors ${theme === "light" ? "text-[#111111] hover:text-sky-600" : "text-white hover:text-sky-300"}`}
                      >
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={mobileHeaderClass}>
          <span className="text-xs tracking-widest uppercase font-semibold text-sky-400">
            {[...NAV, TEAM_NAV].find((n) =>
              n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href.split("?")[0])
            )?.label ?? "Backoffice"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((prev) => prev === "dark" ? "light" : "dark")}
              className={iconButtonClass}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5m-15 0H3m15.364 6.364-1.06-1.06M6.697 6.697 5.636 5.636m12.728 0-1.06 1.061M6.697 17.303l-1.061 1.06M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0Z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3c-.008.116-.01.233-.01.35A7.5 7.5 0 0018.65 10.8c.117 0 .234-.002.35-.01Z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={iconButtonClass}
              aria-label="Open more menu"
            >
              <span className="w-full h-full flex items-center justify-center rounded-full bg-sky-500/15 text-sky-400 font-semibold text-xs">
                {initials}
              </span>
            </button>
          </div>
        </div>

        <main className={mainClass}>
          {children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
      <nav
        className={bottomBarClass}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {[
          {
            label: "Home",
            href: "/admin",
            badge: 0,
            badgeColor: "sky",
            icon: (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            ),
          },
          {
            label: "Projects",
            href: "/admin/projects",
            badge: 0,
            badgeColor: "sky",
            icon: (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
              </svg>
            ),
          },
          {
            label: "Email",
            href: "/admin/email",
            badge: unreadCount,
            badgeColor: "sky",
            icon: (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            ),
          },
          {
            label: "Team",
            href: "/admin/announcements",
            badge: unreadAnnouncements,
            badgeColor: "amber",
            icon: (
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            ),
          },
        ].map((tab) => {
          const isActive = tab.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative min-h-[56px] transition-colors ${
                isActive ? "text-sky-400" : theme === "light" ? "text-black/40" : "text-white/40"
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge > 0 && (
                  <span className={`absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full ${
                    tab.badgeColor === "amber" ? "bg-amber-500" : "bg-sky-500"
                  } text-white text-[9px] font-bold leading-none`}>
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}

        {/* More tab */}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] ${
            theme === "light" ? "text-black/40" : "text-white/40"
          }`}
        >
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {/* AI Assistant — floating panel, rendered outside the sidebar/content flow */}
      <AdminNotificationManager />
      <AIAssistant />
    </div>
  );
}
