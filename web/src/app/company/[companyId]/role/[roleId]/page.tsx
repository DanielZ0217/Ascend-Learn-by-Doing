import { notFound } from "next/navigation";
import { roleIdSchema } from "@/lib/contracts";
import { LearningWorkspace } from "@/components/learning/learning-workspace";

export default async function RolePage({ params }: { params: Promise<{ companyId: string; roleId: string }> }) {
  const { companyId, roleId } = await params;
  const parsed = roleIdSchema.safeParse(roleId);
  if (!parsed.success) notFound();
  return <LearningWorkspace companyId={companyId} roleId={parsed.data} />;
}
