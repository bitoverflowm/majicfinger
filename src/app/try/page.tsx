import { Suspense } from "react";
import RunYourselfWizard from "./RunYourselfWizard";

export const metadata = {
  title: "Run your own analysis | Lychee",
  description: "Run a copy of a published Kalshi weather analysis on your chosen market or trade.",
};

export default function TryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <RunYourselfWizard />
    </Suspense>
  );
}
