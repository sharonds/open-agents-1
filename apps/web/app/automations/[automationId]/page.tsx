import { redirect } from "next/navigation";

export default async function AutomationDetailPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  redirect(`/settings/automations/${automationId}`);
}
