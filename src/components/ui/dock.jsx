"use client";
import React, { createContext, useContext, useRef, useState } from "react";
import { cva } from "class-variance-authority";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils"

/** Lets each DockIcon re-read layout while the spring resizes width (avoids stale distance → wrong axis feel). */
const DockLayoutTickContext = createContext(null)

const DEFAULT_SIZE = 40
const DEFAULT_MAGNIFICATION = 60
const DEFAULT_DISTANCE = 140
const DEFAULT_DISABLEMAGNIFICATION = false

const dockVariants = cva(
  "supports-backdrop-blur:bg-white/10 supports-backdrop-blur:dark:bg-black/10 mx-auto mt-8 flex h-[58px] w-max flex-nowrap items-center justify-center gap-2 overflow-visible rounded-2xl border border-slate-200 p-2 backdrop-blur-md dark:border-slate-800"
)

const Dock = React.forwardRef((
  {
    className,
    children,
    iconSize = DEFAULT_SIZE,
    iconMagnification = DEFAULT_MAGNIFICATION,
    disableMagnification = DEFAULT_DISABLEMAGNIFICATION,
    iconDistance = DEFAULT_DISTANCE,
    direction = "middle",
    ...props
  },
  ref
) => {
  const mouseX = useMotionValue(Infinity)
  const layoutTick = useMotionValue(0)
  const [hovered, setHovered] = useState(false)

  useAnimationFrame(() => {
    if (hovered) layoutTick.set(performance.now())
  })

  const renderChildren = () => {
    return React.Children.map(children, (child) => {
      if (
        React.isValidElement(child) &&
        child.type === DockIcon
      ) {
        return React.cloneElement(child, {
          ...child.props,
          mouseX: mouseX,
          size: iconSize,
          magnification: iconMagnification,
          disableMagnification: disableMagnification,
          distance: iconDistance,
        });
      }
      return child
    });
  }

  return (
    <DockLayoutTickContext.Provider value={layoutTick}>
      <motion.div
        ref={ref}
        {...props}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => {
          setHovered(false)
          mouseX.set(Infinity)
        }}
        className={cn(dockVariants({ className }), {
          "items-start": direction === "top",
          "items-center": direction === "middle",
          "items-end": direction === "bottom",
        })}>
        {renderChildren()}
      </motion.div>
    </DockLayoutTickContext.Provider>
  );
})

Dock.displayName = "Dock"

const DockIcon = ({
  size = DEFAULT_SIZE,
  magnification = DEFAULT_MAGNIFICATION,
  disableMagnification,
  distance = DEFAULT_DISTANCE,
  mouseX,
  className,
  children,
  ...props
}) => {
  const ref = useRef(null)
  const padding = Math.max(6, size * 0.2)
  const defaultMouseX = useMotionValue(Infinity)
  const fallbackLayoutTick = useMotionValue(0)
  const layoutTick = useContext(DockLayoutTickContext) ?? fallbackLayoutTick

  const distanceCalc = useTransform(
    [mouseX ?? defaultMouseX, layoutTick],
    ([val]) => {
      const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
      return val - bounds.x - bounds.width / 2
    }
  )

  const targetSize = disableMagnification ? size : magnification

  const sizeTransform = useTransform(distanceCalc, [-distance, 0, distance], [size, targetSize, size])

  const scaleSize = useSpring(sizeTransform, {
    mass: 0.12,
    stiffness: 220,
    damping: 22,
  })

  return (
    <motion.div
      ref={ref}
      style={{ width: scaleSize, height: scaleSize, padding }}
      className={cn(
        "flex aspect-square cursor-pointer items-center justify-center rounded-full",
        disableMagnification && "hover:bg-slate-500 transition-colors dark:hover:bg-slate-400",
        className
      )}
      {...props}>
      <div className="flex h-full w-full items-center justify-center">{children}</div>
    </motion.div>
  );
}

DockIcon.displayName = "DockIcon"

export { Dock, DockIcon, dockVariants }
