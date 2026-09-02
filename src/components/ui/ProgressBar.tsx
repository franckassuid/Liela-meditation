import React from "react";

interface ProgressBarProps {
  progress: number; // 0 to 1
  className?: string;
  isPlayer?: boolean;
}

export function ProgressBar({ progress, className = "", isPlayer = false }: ProgressBarProps) {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  
  const bgClass = isPlayer ? "bg-[rgba(253,249,240,0.28)]" : "bg-sable";
  let fillClass = isPlayer ? "bg-creme" : "bg-sauge-p";
  
  if (!isPlayer && boundedProgress === 1) {
    fillClass = "bg-etat-succes";
  }

  return (
    <div className={`h-[3px] rounded-full overflow-hidden w-full ${bgClass} ${className}`}>
      <div 
        className={`h-full rounded-full transition-all duration-300 ease-linear ${fillClass}`}
        style={{ width: `${boundedProgress * 100}%` }}
      />
    </div>
  );
}
