/**
 * Kept out of the demo module so the lazy wrapper's skeleton doesn't pull in the dashboard bundle.
 * The homepage demo breaks out of the 84rem column with negative margins (a transform would trap the
 * full-screen stage's fixed positioning). Below lg it grows up to 104rem but never past the viewport;
 * from lg it spans the whole window, less the scrollbar (`--scrollbar`, set by the lazy wrapper).
 */
export const HOMEPAGE_DEMO_SECTION_CLASS =
  "relative mb-0 w-[max(100%,min(100vw_-_2rem,104rem))] ml-[calc((100%_-_max(100%,min(100vw_-_2rem,104rem)))/2)] mt-14 px-6 pb-6 pt-0 sm:mt-12 sm:px-8 md:mt-8 lg:mt-6 lg:w-[calc(100vw_-_var(--scrollbar,0px))] lg:ml-[calc(50%_-_(100vw_-_var(--scrollbar,0px))/2)] lg:px-0";

/** Guide and hub embeds sit inside an already padded column. */
export const EMBEDDED_DEMO_SECTION_CLASS = "relative mx-auto w-full";

export const DEMO_CONTENT_HEIGHT_CLASS = "h-[min(90vh,920px)] min-h-[720px]";

export const DEMO_WINDOW_TITLE = "Lychee Terminal";
