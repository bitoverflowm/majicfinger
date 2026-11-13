export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-9 w-72 animate-pulse rounded bg-muted" />
        <p className="text-sm text-muted-foreground">Jarvis is running 16 reads on this wallet. This takes about 20 seconds the first time.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
        ))}
      </div>
    </main>
  );
}
