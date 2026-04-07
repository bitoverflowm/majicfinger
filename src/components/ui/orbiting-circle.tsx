"use client";

import * as React from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export interface OrbitingCirclesProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  reverse?: boolean;
  radius?: number;
  iconSize?: number;
  speed?: number;
  index?: number;
  startAnimationDelay?: number;
  once?: boolean;
  path?: boolean;
}

export function OrbitingCircles({
  className,
  children,
  reverse,
  radius = 160,
  iconSize = 30,
  speed = 1,
  index = 0,
  startAnimationDelay = 0,
  once = false,
  path = true,
}: OrbitingCirclesProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, { once });
  const [shouldAnimate, setShouldAnimate] = React.useState(false);

  React.useEffect(() => {
    setShouldAnimate(!!isInView);
  }, [isInView]);

  const count = React.Children.count(children);

  return (
    <>
      {path && (
        <motion.div ref={ref}>
          {shouldAnimate && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                duration: 0.8,
                ease: [0.23, 1, 0.32, 1],
                delay: index * 0.2 + startAnimationDelay,
                type: "spring",
                stiffness: 120,
                damping: 18,
                mass: 1,
              }}
              className="pointer-events-none absolute inset-0"
              style={{
                width: radius * 2,
                height: radius * 2,
                left: `calc(50% - ${radius}px)`,
                top: `calc(50% - ${radius}px)`,
              }}
            >
              <div
                className={cn(
                  "size-full rounded-full",
                  "border border-[0,0,0,0.07] dark:border-[rgba(249,250,251,0.07)]",
                  "bg-gradient-to-b from-[rgba(0,0,0,0.05)] from-0% via-[rgba(249,250,251,0.00)] via-54.76%",
                  "dark:bg-gradient-to-b dark:from-[rgba(249,250,251,0.03)] dark:from-0% dark:via-[rgba(249,250,251,0.00)] dark:via-54.76%",
                  className,
                )}
              />
            </motion.div>
          )}
        </motion.div>
      )}

      {shouldAnimate &&
        React.Children.map(children, (child, childIndex) => {
          const angle = count ? (360 / count) * childIndex : 0;
          return (
            <div
              style={
                {
                  "--radius": radius * 0.98,
                  "--angle": angle,
                  "--icon-size": `${iconSize}px`,
                  "--duration": String(20 / Math.max(0.1, speed)),
                } as React.CSSProperties
              }
              className={cn(
                "absolute flex size-[var(--icon-size)] z-20 p-1 transform-gpu animate-orbit items-center justify-center rounded-full",
                { "[animation-direction:reverse]": reverse },
              )}
            >
              <motion.div
                key={`orbit-child-${childIndex}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: 0.6 + childIndex * 0.2 + startAnimationDelay,
                  ease: [0, 0, 0.58, 1],
                  type: "spring",
                  stiffness: 120,
                  damping: 18,
                  mass: 1,
                }}
              >
                {child}
              </motion.div>
            </div>
          );
        })}
    </>
  );
}

