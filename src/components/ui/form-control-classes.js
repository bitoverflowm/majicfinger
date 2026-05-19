/**
 * Shared Tailwind classes for text fields — uses CSS theme variables so light/dark stay readable.
 */
export const formControlClassName =
  "border-input bg-background text-foreground shadow-sm ring-offset-background placeholder:text-muted-foreground file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background dark:[color-scheme:dark]";
