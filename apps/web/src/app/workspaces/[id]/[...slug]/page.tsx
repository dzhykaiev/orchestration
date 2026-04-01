import { redirect } from "next/navigation";

export default async function WorkspaceLegacyNestedPage({
  params,
}: {
  params: Promise<{ id: string; slug?: string[] }>;
}) {
  const { id, slug = [] } = await params;
  const nestedPath = slug.length > 0 ? `/${slug.join("/")}` : "";
  redirect(`/companies/${id}${nestedPath}`);
}
