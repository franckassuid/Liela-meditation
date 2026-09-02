import React from "react";
import { ProgressBar } from "./ProgressBar";
import { LockIcon } from "./Icons";

interface SessionCardProps {
  title: string;
  duration: number; // in seconds
  situationName?: string;
  situationColor?: string;
  situationVoile?: string;
  progress?: number; // 0 to 1
  isLocked?: boolean;
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
  isLocked = false,
  onClick,
  className = "",
}: SessionCardProps) {
  const durationMinutes = Math.round(duration / 60);

  return (
    <div
      onClick={onClick}
      className={`rounded-md p-[18px] shadow-p1 cursor-pointer transition-transform duration-120 active:scale-[0.97] border-l-4 ${
        isLocked
          ? "bg-surface/75 opacity-70 border-filet grayscale-[20%]"
          : "bg-surface"
      } ${className}`}
      style={{
        borderLeftColor: isLocked ? "var(--filet)" : situationColor || "var(--bord)",
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {situationName && (
            <span 
              className="inline-block text-[12px] font-semibold px-[11px] py-[3px] rounded-xs"
              style={{
                backgroundColor: isLocked ? "var(--sable)" : situationVoile || "var(--sable)",
                color: isLocked ? "var(--gris-2)" : situationColor || "var(--gris-2)",
              }}
            >
              {situationName}
            </span>
          )}
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-[2px] rounded-full bg-sable text-gris-2">
              <LockIcon size={12} />
              <span>Pro</span>
            </span>
          )}
        </div>
        <span className="text-[13px] text-gris-2 font-medium">{durationMinutes} min</span>
      </div>

      <h4 className={`font-poppins font-normal text-[18px] leading-[1.2] ${isLocked ? "text-gris-2" : "text-encre"}`}>
        {title}
      </h4>
      
      {progress !== undefined && !isLocked && (
        <div className="mt-3.5">
          <ProgressBar progress={progress} />
        </div>
      )}
    </div>
  );
}
