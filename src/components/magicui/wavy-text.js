"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";


const WavyText = ({
  word,
  className,
  variant,
  duration = 0.5,
  delay = 0.05,
}) => {
  const defaultVariants = {
    hidden: { y: 10 },
    visible: { y: -10 },
  };
  const combinedVariants = variant || defaultVariants;
  const characters = useMemo(() => word.split(""), [word]);
  return (
    <div className="flex flex-wrap space-x-2">
      <AnimatePresence>
        {characters.map((char, i) => (
          <motion.h1
            key={i}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={combinedVariants}
            transition={{
              yoyo: Infinity,
              duration: duration,
              delay: i * delay,
            }}
            className={cn(
              className,
              "font-display text-center font-bold tracking-[-0.15em]",
            )}
          >
            {char}
          </motion.h1>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default WavyText;
