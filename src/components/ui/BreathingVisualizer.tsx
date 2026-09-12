"use client";

import React, { useEffect, useRef } from "react";

// --- Configuration originale de la page de lecture ---
const CONFIG = {
  cycleDurationMs: 11000,
  inspireMs: 4000,
  holdMs: 1000,
  expireMs: 6000,
  baseRadiusFactor: 0.32,
  radiusMinFactor: 0.80,
  radiusVarFactor: 0.30,
  audioLevelA: 0.35,
  segments: 120,
  yScale: 0.94,
  fps: 30,
  color: "rgba(253, 249, 240, ", // Crème (#FDF9F0) pour la page de lecture
};

function easeIO(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function hexToRgb(hex: string): { r: number; g: number; b: number; str: string } {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 162;
  const g = parseInt(clean.substring(2, 4), 16) || 98;
  const b = parseInt(clean.substring(4, 6), 16) || 72;
  return { r, g, b, str: `${r}, ${g}, ${b}` };
}

export interface BreathingVisualizerProps {
  rmsData?: number[] | null;
  getCurrentTime?: () => number;
  color?: string; // Couleur personnalisée (hex ex: "#A26248") pour la page d'accueil
  className?: string;
  onClick?: () => void;
}

export function BreathingVisualizer({
  rmsData,
  getCurrentTime,
  color,
  className = "",
  onClick,
}: BreathingVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rmsDataRef = useRef(rmsData);
  const getCurrentTimeRef = useRef(getCurrentTime);
  const colorRef = useRef(color);

  useEffect(() => {
    rmsDataRef.current = rmsData;
    getCurrentTimeRef.current = getCurrentTime;
    colorRef.current = color;
  }, [rmsData, getCurrentTime, color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let cx = 0;
    let cy = 0;
    let S = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w === 0 || h === 0) continue;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = w;
        height = h;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        cx = w / 2;
        cy = h / 2;
        S = Math.min(w, h);
      }
    });

    resizeObserver.observe(container);

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrameId: number;
    let lastDrawTime = 0;
    const frameInterval = 1000 / CONFIG.fps;

    const draw = (t: number) => {
      if (document.visibilityState === "hidden") {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }

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

      // Calcul RMS (pour modulation audio lors de la lecture)
      let currentRms = 0;
      const currentRmsData = rmsDataRef.current;
      const currentGetTime = getCurrentTimeRef.current;

      if (currentRmsData && currentRmsData.length > 0 && currentGetTime) {
        const timeSec = currentGetTime();
        const index = Math.floor(timeSec * 10);
        if (index >= 0 && index < currentRmsData.length) {
          currentRms = currentRmsData[index];
        }
      }

      const a = CONFIG.audioLevelA + 0.65 * currentRms;
      const R =
        S *
        CONFIG.baseRadiusFactor *
        (CONFIG.radiusMinFactor + CONFIG.radiusVarFactor * shapeSouffle) *
        (1 + 0.05 * currentRms);

      const customHex = colorRef.current;
      const isCustomColor = Boolean(customHex);

      // Définition des couches : exactement 2 couches (scale 1.00 et scale 1.16) sur les deux écrans
      const layers = isCustomColor
        ? [
            { scale: 1.00, alpha: 0.70, phase: 0 },
            { scale: 1.16, alpha: 0.30, phase: 1.7 },
          ]
        : [
            { scale: 1.00, alpha: 0.20, phase: 0 },
            { scale: 1.16, alpha: 0.10, phase: 1.7 },
          ];

      const colorBase = isCustomColor
        ? `rgba(${hexToRgb(customHex!).str}, `
        : CONFIG.color;

      for (const layer of layers) {
        let currentAlpha = layer.alpha;

        if (isReduced) {
          const opacityFactor = 0.8 + 0.3 * souffle;
          currentAlpha *= opacityFactor;
        }

        ctx.fillStyle = `${colorBase}${currentAlpha})`;
        ctx.beginPath();

        const R_layer = R * layer.scale;

        // ÉQUATION EXACTE DE DÉFORMATION DU LECTEUR DE SÉANCE :
        for (let i = 0; i <= CONFIG.segments; i++) {
          const theta = (i / CONFIG.segments) * Math.PI * 2;
          const animT = isReduced ? 0 : t;

          const d =
            1 +
            0.10 * Math.sin(3 * theta + animT / 2600 + layer.phase) +
            0.06 * Math.sin(2 * theta - animT / 3900 + layer.phase) +
            a * 0.09 * Math.sin(5 * theta + animT / 900 + layer.phase);

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
  }, []);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={`w-full h-full absolute inset-0 flex items-center justify-center ${
        onClick ? "pointer-events-auto cursor-pointer" : "pointer-events-none"
      } ${className}`}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
