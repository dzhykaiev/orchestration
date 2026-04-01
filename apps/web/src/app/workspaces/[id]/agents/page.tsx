import { redirect } from "next/navigation";

export default async function WorkspaceLegacyAgentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/companies/${id}/agents`);
}
