import Link from "next/link";
import { DashboardsSection } from "@/components/sections/dashboards-section";

function GalleryCta() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
      <div className="rounded-xl border border-border bg-background/80 p-6 text-center shadow-sm backdrop-blur-sm">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Start building your own dashboard
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Publish once, share everywhere. No code required.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/#pricing"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            View pricing
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardsGalleryPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="pb-8">
        <GalleryCta />
      </div>

      <DashboardsSection username="misterrpink" limit={60} showCta={false} />

      <div className="pb-16 pt-8">
        <GalleryCta />
      </div>
    </main>
  );
}

