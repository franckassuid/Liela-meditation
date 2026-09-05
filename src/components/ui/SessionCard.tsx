import React from "react";
import { ProgressBar } from "./ProgressBar";
import { LockIcon, HeartIcon } from "./Icons";

interface SessionCardProps {
  title: string;
  duration: number; // in seconds
  situationName?: string;
  situationColor?: string;
  situationVoile?: string;
  textColor?: string;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
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
  textColor,
  isFavorite,
  onToggleFavorite,
  progress,
  isLocked = false,
  onClick,
  className = "",
}: SessionCardProps) {
  const durationMinutes = Math.round(duration / 60);
  
  // Si textColor est fourni (généralement pour Sommeil où le fond est sombre)
  const isDark = !!textColor;
  const cardBgClass = isDark 
    ? "bg-creme/8 shadow-none text-creme" 
    : "bg-white shadow-[0_1px_2px_rgba(67,53,40,0.05),_0_8px_18px_-14px_rgba(67,53,40,0.2)] text-encre";
  
  const subtextColor = isDark ? "text-creme/60" : "text-gris-2";

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-[10px] rounded-[13px] p-[9px_11px] cursor-pointer transition-transform duration-120 active:scale-[0.98] ${cardBgClass} ${className}`}
    >
      <span 
        className="w-[36px] h-[36px] rounded-[10px] shrink-0" 
        style={{ background: isDark ? "rgba(253,249,240,.14)" : situationColor || "var(--bord)" }}
      ></span>
      
      <div className="flex-1 min-w-0">
        <b className="block text-[12.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
          {title}
        </b>
        <i className={`block not-italic text-[10.5px] ${subtextColor}`}>
          {durationMinutes} min {situationName && `· ${situationName}`}
        </i>
        {progress !== undefined && progress > 0 && (
          <div className="mt-1.5 max-w-[120px]">
            <ProgressBar progress={progress} />
          </div>
        )}
      </div>

      {onToggleFavorite && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(e);
          }}
          className="p-1 -mr-1 rounded-full transition-transform active:scale-90"
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          {isFavorite ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#A26248" stroke="#A26248" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? "rgba(253,249,240,.45)" : "#C6BBA9"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 8.4 3.8 3.8 0 0 1 19 10.8C19 15.6 12 20 12 20Z"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
