"use client";

import { useRouter } from "next/navigation";
import { AutomationForm } from "../automation-form";
import { useAutomations } from "@/hooks/use-automations";

export function AutomationNewPage() {
  const router = useRouter();
  const { createAutomation } = useAutomations();

  return (
    <>
      <h1 className="text-2xl font-semibold">New Automation</h1>
      <AutomationForm
        submitLabel="Create automation"
        onSubmit={async (input) => {
          const automation = await createAutomation(input);
          router.push(`/settings/automations/${automation.id}`);
        }}
      />
    </>
  );
}
