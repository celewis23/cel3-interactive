import NotificationCenter from "@/components/admin/notifications/NotificationCenter";

export default async function NotificationsPage({ searchParams }: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  return <NotificationCenter kind={kind ?? "email"} />;
}
