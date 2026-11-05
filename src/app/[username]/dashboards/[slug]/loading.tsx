import { DashboardBodySkeleton } from "@/components/publicEmbed/PublicDashboardSkeletons";
import { DashboardLoadingProgress } from "@/components/publicEmbed/DashboardLoadingProgress";

/** Shown the moment a listing is clicked, while the dashboard shell renders on the server. */
export default function PublicDashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 pt-5 sm:px-6" aria-busy="true">
        <span className="block h-3 w-56 animate-pulse rounded bg-muted" />
        <div className="mt-6 space-y-3">
          <span className="block h-5 w-36 animate-pulse rounded-full bg-muted" />
          <span className="block h-8 w-2/3 max-w-xl animate-pulse rounded-md bg-muted" />
          <span className="block h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
          <span className="block h-4 w-1/2 max-w-md animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 sm:px-6">
        <div className="mb-4">
          <DashboardLoadingProgress />
        </div>
        <DashboardBodySkeleton />
      </div>
    </div>
  );
}
