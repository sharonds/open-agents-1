import type { Metadata } from "next";
import { AutomationDetailPage } from "./automation-detail-page";

export const metadata: Metadata = {
  title: "Automation",
  description: "View and manage a saved automation.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = await params;
  return <AutomationDetailPage automationId={automationId} />;
}
