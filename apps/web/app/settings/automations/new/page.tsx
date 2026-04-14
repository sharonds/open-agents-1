import type { Metadata } from "next";
import { AutomationNewPage } from "./automation-new-page";

export const metadata: Metadata = {
  title: "New Automation",
  description: "Create a new automation.",
};

export default function Page() {
  return <AutomationNewPage />;
}
