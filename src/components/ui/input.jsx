import * as React from "react"

import { cn } from "@/lib/utils"
import { formControlClassName } from "@/components/ui/form-control-classes"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        formControlClassName,
        className
      )}
      ref={ref}
      {...props} />
  );
})
Input.displayName = "Input"

export { Input }
