"use client";

import { useEffect, useRef } from "react";

export type AnalogVUMeterProps = {
  level: number;
  width?: number;
  height?: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const AnalogVUMeter = ({ level, width = 120, height = 80 }: AnalogVUMeterProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    targetRef.current = clamp(level, 0, 1);
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const target = targetRef.current;
      const current = currentRef.current + (target - currentRef.current) * 0.2;
      currentRef.current = current;

      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "#f1e4bf";
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = "#2e2a24";
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, width - 2, height - 2);

      // Arc
      ctx.strokeStyle = "#8e0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width / 2, height - 6, width * 0.42, Math.PI, 2 * Math.PI, false);
      ctx.stroke();

      // Ticks
      ctx.strokeStyle = "#3a2b1f";
      ctx.lineWidth = 1;
      const tickCount = 7;
      for (let i = 0; i <= tickCount; i += 1) {
        const t = i / tickCount;
        const angle = Math.PI + t * Math.PI;
        const r1 = width * 0.36;
        const r2 = width * 0.42;
        const x1 = width / 2 + Math.cos(angle) * r1;
        const y1 = height - 6 + Math.sin(angle) * r1;
        const x2 = width / 2 + Math.cos(angle) * r2;
        const y2 = height - 6 + Math.sin(angle) * r2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Needle (center pivot, left-right)
      const needleAngle = Math.PI + current * Math.PI;
      const needleLen = width * 0.36;
      const nx = width / 2 + Math.cos(needleAngle) * needleLen;
      const ny = height - 6 + Math.sin(needleAngle) * needleLen;
      ctx.strokeStyle = "#8e0000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2, height - 6);
      ctx.lineTo(nx, ny);
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};
