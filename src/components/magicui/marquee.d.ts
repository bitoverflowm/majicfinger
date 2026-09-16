import * as React from "react";

declare function Marquee(props: React.HTMLAttributes<HTMLDivElement> & {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
}): React.JSX.Element;

export default Marquee;
