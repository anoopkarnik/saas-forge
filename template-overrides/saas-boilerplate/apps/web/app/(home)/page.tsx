"use client";

export default function Page() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 md:px-8">
      <div className="rounded-3xl border border-border/60 bg-card p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Starter Ready
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome to your SaaS starter</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          This template keeps auth, billing, CMS, docs, admin, desktop, and mobile foundations in sync with the
          main boilerplate. The download and scaffold workflow only lives in the root repository, so the starter
          ships as a clean app workspace.
        </p>
      </div>
    </div>
  );
}
