import Image from "next/image";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import backdrop from "../../../public/landing/demo-backdrop.jpg";

/** Painted backdrop the homepage demo window sits on. */
export function DemoBackdrop({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl p-3 sm:p-8 lg:p-12", className)} {...props}>
      <Image
        src={backdrop}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="(min-width: 1344px) 1344px, 100vw"
        className="pointer-events-none select-none object-cover"
      />
      {children}
    </div>
  );
}
