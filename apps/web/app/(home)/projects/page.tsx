import { ProjectList } from "@/components/projects/ProjectList";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <ProjectList />
    </div>
  );
}
