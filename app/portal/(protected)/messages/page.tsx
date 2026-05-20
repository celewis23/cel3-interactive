export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import MessengerClient from "@/components/messaging/MessengerClient";

export default function PortalMessagesPage() {
  return <MessengerClient mode="portal" />;
}

