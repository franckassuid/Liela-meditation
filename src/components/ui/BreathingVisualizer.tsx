"use client";

import React, { useEffect, useRef } from "react";

// --- Configuration ---
const CONFIG = {
  cycleDurationMs: 11000,
  inspireMs: 4000,
  holdMs: 1000,
  expireMs: 6000,
  baseRadiusFactor: 0.30,
  radiusMinFactor: 0.80,
  radiusVarFactor: 0.30,
  audioLevelA: 0.35, // Option 3: constante
  layers: [
    { scale: 1.00, alpha: 0.20, phase: 0 },
    { scale: 1.16, alpha: 0.10, phase: 1.7 },
  ],
  segments: 120,
  yScale: 0.94,
  fps: 30,
  color: "rgba(253, 249, 240, ", // Crème (#FDF9F0) sans l'alpha final
};

function easeIO(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

interface BreathingVisualizerProps {
  rmsData?: number[] | null;
  getCurrentTime?: () => number;
}

export function BreathingVisualizer({ rmsData, getCurrentTime }: BreathingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const rmsDataRef = useRef(rmsData);
  const getCurrentTimeRef = useRef(getCurrentTime);

  useEffect(() => {
    rmsDataRef.current = rmsData;
    getCurrentTimeRef.current = getCurrentTime;
  }, [rmsData, getCurrentTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle Resize
    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let S = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        // Use devicePixelRatio for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        width = w;
        height = h;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        cx = w / 2;
        cy = h / 2;
        S = Math.min(w, h);
      }
    });

    resizeObserver.observe(container);

    // Animation Loop
    let animationFrameId: number;
    let lastDrawTime = 0;
    const frameInterval = 1000 / CONFIG.fps;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (t: number) => {
      // Visibility Check: stop drawing if backgrounded
      if (document.visibilityState === "hidden") {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

      // FPS Limit
      const elapsed = t - lastDrawTime;
      if (elapsed < frameInterval) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = t - (elapsed % frameInterval);

      ctx.clearRect(0, 0, width, height);

      const isReduced = reducedMotionQuery.matches;
      const p = t % CONFIG.cycleDurationMs;
      
      let souffle = 0;
      if (p < CONFIG.inspireMs) {
        souffle = easeIO(p / CONFIG.inspireMs);
      } else if (p < CONFIG.inspireMs + CONFIG.holdMs) {
        souffle = 1;
      } else {
        souffle = 1 - easeIO((p - CONFIG.inspireMs - CONFIG.holdMs) / CONFIG.expireMs);
      }

      const shapeSouffle = isReduced ? 0.5 : souffle;
      
      // Calculate RMS value
      let currentRms = 0;
      const currentRmsData = rmsDataRef.current;
      const currentGetTime = getCurrentTimeRef.current;
      
      if (currentRmsData && currentRmsData.length > 0 && currentGetTime) {
        const timeSec = currentGetTime();
        const index = Math.floor(timeSec * 10); // 10 Hz
        if (index >= 0 && index < currentRmsData.length) {
          currentRms = currentRmsData[index];
        }
      }

      // Modulate parameters based on RMS
      const a = CONFIG.audioLevelA + 0.65 * currentRms; 
      const R = S * CONFIG.baseRadiusFactor * (CONFIG.radiusMinFactor + CONFIG.radiusVarFactor * shapeSouffle) * (1 + 0.05 * currentRms);

      // Draw Layers
      for (const layer of CONFIG.layers) {
        let currentAlpha = layer.alpha;
        
        // If reduced motion, animate opacity slightly instead of the shape
        if (isReduced) {
          const opacityFactor = 0.8 + 0.3 * souffle;
          currentAlpha *= opacityFactor;
        }

        ctx.fillStyle = `${CONFIG.color}${currentAlpha})`;
        ctx.beginPath();

        const R_layer = R * layer.scale;

        for (let i = 0; i <= CONFIG.segments; i++) {
          const theta = (i / CONFIG.segments) * Math.PI * 2;
          
          // Only deform if not reduced motion
          const animT = isReduced ? 0 : t;
          
          const d = 1 
            + 0.10 * Math.sin(3 * theta + animT / 2600 + layer.phase)
            + 0.06 * Math.sin(2 * theta - animT / 3900 + layer.phase)
            + a * 0.09 * Math.sin(5 * theta + animT / 900 + layer.phase);

          const x = cx + Math.cos(theta) * R_layer * d;
          const y = cy + Math.sin(theta) * R_layer * d * CONFIG.yScale;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Run once, using refs for dynamic data

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0 flex items-center justify-center pointer-events-none">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
