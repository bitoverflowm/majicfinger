import * as React from "react";

declare function Ripple(props: {
  mainCircleSize?: number;
  mainCircleOpacity?: number;
  numCircles?: number;
  circleSizeStep?: number;
  className?: string;
  circleClassName?: string;
}): React.JSX.Element;

export default Ripple;
