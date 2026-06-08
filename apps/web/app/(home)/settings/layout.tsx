import Link from "next/link";
import type { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container mx-auto flex flex-col gap-6 px-4 py-8 md:flex-row md:gap-8">
      <aside className="md:w-56">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </h2>
        <nav className="flex flex-col gap-1 text-sm">
          <Link
            href="/settings/api-keys"
            className="rounded-md px-3 py-2 text-foreground hover:bg-muted"
          >
            API Keys
          </Link>
        </nav>
      </aside>
      <section className="flex-1">{children}</section>
    </div>
  );
}
