"use client";

import { cn } from "@/lib/utils";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const FRAME_MS = 1000 / 15;

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const effectiveMaxOpacity = isDark ? Math.min(maxOpacity, 0.22) : maxOpacity;

  const memoizedColor = useMemo(() => {
    const toRGBA = (c: string) => {
      if (typeof window === "undefined") return "rgba(0, 0, 0,";
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "rgba(255, 0, 0,";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r}, ${g}, ${b},`;
    };
    return toRGBA(color);
  }, [color]);

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, w: number, h: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const cols = Math.floor(w / (squareSize + gridGap));
      const rows = Math.floor(h / (squareSize + gridGap));
      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * effectiveMaxOpacity;
      }
      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, effectiveMaxOpacity]
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * effectiveMaxOpacity;
        }
      }
    },
    [flickerChance, effectiveMaxOpacity]
  );

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number
    ) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr
          );
        }
      }
    },
    [memoizedColor, squareSize, gridGap]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let gridParams: ReturnType<typeof setupCanvas>;
    let inView = false;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const draw = () =>
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr
      );

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
      draw();
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);
      if (time - lastTime < FRAME_MS) return;
      const deltaTime = lastTime ? (time - lastTime) / 1000 : 0;
      lastTime = time;
      updateSquares(gridParams.squares, Math.min(deltaTime, 0.25));
      draw();
    };

    const sync = () => {
      const shouldRun = inView && !document.hidden && !reducedMotion;
      if (shouldRun && !animationFrameId) {
        lastTime = 0;
        animationFrameId = requestAnimationFrame(animate);
      } else if (!shouldRun && animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    const resizeObserver = new ResizeObserver(() => updateCanvasSize());
    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      {...props}
    >
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{ width: canvasSize.width, height: canvasSize.height }}
      />
    </div>
  );
};
