import React from "react";
import { ProgressBar } from "./ProgressBar";

interface SessionCardProps {
  title: string;
  duration: number; // in seconds
  situationName?: string;
  situationColor?: string;
  situationVoile?: string;
  progress?: number; // 0 to 1
  onClick?: () => void;
  className?: string;
}

export function SessionCard({
  title,
  duration,
  situationName,
  situationColor,
  situationVoile,
  progress,
  onClick,
  className = "",
}: SessionCardProps) {
  const durationMinutes = Math.round(duration / 60);

  return (
    <div
      onClick={onClick}
      className={`bg-surface rounded-md p-[18px] shadow-p1 cursor-pointer transition-transform duration-120 active:scale-[0.97] border-l-4 ${className}`}
      style={{
        borderLeftColor: situationColor || "var(--bord)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        {situationName && (
          <span 
            className="inline-block text-[12px] font-semibold px-[11px] py-[4px] rounded-xs"
            style={{
              backgroundColor: situationVoile || "var(--sable)",
              color: situationColor || "var(--gris-2)",
            }}
          >
            {situationName}
          </span>
        )}
        <span className="text-[13px] text-gris-2 font-medium">{durationMinutes} min</span>
      </div>

      <h4 className="font-poppins font-normal text-[19px] leading-[1.2] text-encre">
        {title}
      </h4>
      
      {progress !== undefined && (
        <div className="mt-3.5">
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
}
