import { AgentForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";

export default function NewAgentPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Desk" title="Add agent" description="Used for lead allocation and salesperson fields." />
      <AgentForm />
    </div>
  );
}
