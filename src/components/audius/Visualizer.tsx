"use client";

import { useEffect, useRef } from "react";

interface VisualizerProps {
  isPlaying: boolean;
  analyser?: AnalyserNode | null;
}

export function Visualizer({ isPlaying, analyser }: VisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255,255,255,0.15)";

      if (!isPlaying || !analyser) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const bufferLength = analyser.fftSize;
      const data = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(data);

      const mid = canvas.height / 2;
      const step = Math.ceil(bufferLength / canvas.width);

      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 1) {
        const v = (data[x * step] - 128) / 128;
        const y = mid + v * mid * 0.85;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [isPlaying, analyser]);

  return <canvas ref={canvasRef} className="w-full h-20 md:h-24" />;
}
