import { Source_Serif_4 } from "next/font/google";

/** Reading serif for lychee_content — scoped via layout wrapper, not site-wide. */
export const articleSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-article-serif",
  display: "swap",
});
