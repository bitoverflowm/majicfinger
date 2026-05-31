import Link from "next/link";

export function HomepageFeatureCallout() {
  return (
    <div className="relative z-20 mx-auto w-full max-w-[min(100%,84rem)] px-6 pb-14 pt-2 sm:px-8 md:pb-16 lg:px-10 lg:pb-20">
      <div className="mx-auto max-w-3xl rounded-xl border border-border/70 bg-muted/25 px-5 py-5 text-center sm:px-6 sm:py-6">
        <p className="text-sm leading-relaxed text-muted-foreground md:text-[15px]">
          <span className="font-medium text-foreground">
            Want your analysis on our homepage?
          </span>{" "}
          Run your analysis in Lychee, publish a chart or dashboard, and we may feature standout
          community work on the homepage.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/#pricing"
            className="inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            prefetch={false}
          >
            View pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
