import { fetchDocumentation } from "@/lib/functions/fetchDocumentation";
import { notFound, redirect } from "next/navigation";

export default async function DocumentationIndexPage() {
  const documentation = await fetchDocumentation();
  const firstDoc = documentation.docs[0];

  if (!firstDoc) {
    notFound();
  }

  redirect(`/landing/doc/${firstDoc.slug}`);
}
