import Image from "next/image";

const LOGO_PX = 30;

/** Lychee × Polymarket badge for hub explore + guide embeds. */
export function HubPolymarketExplorerBranding() {
  return (
    <div className="flex flex-col items-center gap-2.5 pt-1">
      <div className="relative flex h-[30px] w-[46px] items-center" aria-hidden>
        <Image
          src="/logo.png"
          alt=""
          width={LOGO_PX}
          height={LOGO_PX}
          className="relative z-10 size-[30px] shrink-0 rounded-full object-contain ring-2 ring-background"
        />
        <div className="relative z-0 -ml-3 flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-background ring-2 ring-border/70">
          <Image
            src="/polymarket.png"
            alt=""
            width={22}
            height={22}
            className="size-[22px] object-contain"
          />
        </div>
      </div>
      <span className="inline-flex rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
        Historical Data
      </span>
    </div>
  );
}
