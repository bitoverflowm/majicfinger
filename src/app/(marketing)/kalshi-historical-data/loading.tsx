export default function IntegrationHubLoading() {
  return (
    <main className="flex min-h-screen w-full flex-col items-stretch bg-background font-sans antialiased">
      <div className="flex w-full flex-col items-center px-6 pb-20 pt-36 md:pb-28 md:pt-44">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <div className="h-10 w-3/4 max-w-lg animate-pulse rounded-lg bg-muted" />
          <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-muted/70" />
          <div className="h-5 w-5/6 max-w-xl animate-pulse rounded bg-muted/60" />
        </div>
      </div>
      <div className="mx-auto mt-8 h-48 w-full max-w-4xl animate-pulse rounded-xl bg-muted/40 px-6" />
    </main>
  );
}
