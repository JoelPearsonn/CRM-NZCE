import { notFound } from "next/navigation";
import { AgentForm } from "@/components/forms";
import { PageHeader } from "@/components/ui";
import type { IdPageProps } from "@/lib/page-props";
import { prisma } from "@/lib/prisma";

export default async function EditAgentPage({ params }: IdPageProps) {
  const { id } = await params;
  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader kicker="Edit" title={agent.name} />
      <AgentForm agent={agent} />
    </div>
  );
}
