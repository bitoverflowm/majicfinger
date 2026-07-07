import Image from "next/image";

const LOGO_PX = 30;
const KALSHI_GREEN = "#28CC95";

export function HubKalshiExplorerBranding() {
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
        <div
          className="relative z-0 -ml-3 flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-background"
          style={{ backgroundColor: KALSHI_GREEN }}
        >
          <Image
            src="/kalshi.png"
            alt=""
            width={20}
            height={20}
            className="size-5 object-contain"
          />
        </div>
      </div>
      <span className="inline-flex rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">
        Historical Data
      </span>
    </div>
  );
}
