import Image from "next/image";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import backdrop from "../../../public/landing/demo-backdrop.jpg";

/** Painted backdrop the homepage demo window sits on. The navbar slides out of the way while it scrolls past. */
export function DemoBackdrop({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-hides-nav
      className={cn("relative overflow-hidden rounded-xl p-3 sm:p-8 lg:p-12", className)}
      {...props}
    >
      <Image
        src={backdrop}
        alt=""
        fill
        priority
        placeholder="blur"
        sizes="(min-width: 1696px) 1664px, 100vw"
        className="pointer-events-none select-none object-cover"
      />
      {children}
    </div>
  );
}
