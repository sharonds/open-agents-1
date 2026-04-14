import type { Metadata } from "next";
import { AutomationsListPage } from "./automations-list-page";

export const metadata: Metadata = {
  title: "Automations",
  description: "Create and manage recurring automations.",
};

export default function Page() {
  return <AutomationsListPage />;
}
