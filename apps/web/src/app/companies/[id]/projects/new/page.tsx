import { redirect } from "next/navigation";

export default async function CompanyProjectNewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/new?companyId=${id}`);
}
