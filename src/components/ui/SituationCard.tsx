import React from "react";
import { Situation } from "../../config/situations";
import { StressIcon, SleepIcon, FocusIcon, EmotionsIcon, EnergyIcon, BreathIcon } from "./Icons";

interface SituationCardProps {
  situation: Situation;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
}

const situationIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  stress: StressIcon,
  sleep: SleepIcon,
  thoughts: EmotionsIcon,
  focus: FocusIcon,
  tensions: EnergyIcon,
  recenter: BreathIcon,
};

export function SituationCard({ situation, onClick, className = "", selected = false }: SituationCardProps) {
  const Icon = situationIcons[situation.id];
  
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-md min-h-[90px] sm:min-h-[100px] p-3.5 sm:p-[18px] flex flex-col justify-between items-start text-left transition-transform duration-120 active:scale-[0.97] ${className}`}
      style={{
        backgroundColor: situation.color,
        color: situation.textColor,
        boxShadow: selected ? "var(--p2)" : "none",
      }}
    >
      {Icon && <Icon size={20} className="opacity-90 mb-2" />}
      <b className="font-poppins font-normal text-[15px] sm:text-[16px] leading-[1.15]">{situation.shortLabel}</b>
    </button>
  );
}
