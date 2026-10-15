import { Launchpad } from "@/components/projects/Launchpad";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <Launchpad slug={slug} />;
}
