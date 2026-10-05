import { DownloadsList } from "@/components/projects/DownloadsList";
import { ProjectList } from "@/components/projects/ProjectList";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <ProjectList />
      <DownloadsList />
    </div>
  );
}
