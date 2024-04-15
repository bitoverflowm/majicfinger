import React from 'react'; // Import React
import { cn } from "@/lib/utils"; // Utility to concatenate classNames neatly

const AnimatedShinyText = ({ children, className, shimmerWidth = 100 }) => {
    return (
        <p
            style={{
                '--shimmer-width': `${shimmerWidth}px`,
                backgroundSize: `var(--shimmer-width) 100%`, // Ensuring the background size uses the custom property
            }}
            className={cn(
                "mx-auto max-w-md text-neutral-600/50 dark:text-neutral-400/50",
                "animate-shimmer bg-clip-text text-transparent bg-no-repeat",
                "[background-position:0_0]",
                "bg-gradient-to-r from-transparent via-black/50 to-transparent dark:via-white/50",
                className,
            )}
        >
            {children}
        </p>
    );
}

export default AnimatedShinyText;