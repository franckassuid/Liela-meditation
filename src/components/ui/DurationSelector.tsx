import React from "react";

interface DurationSelectorProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}

export function DurationSelector({ label, selected, onClick, className = "" }: DurationSelectorProps) {
  const stateClasses = selected
    ? "bg-encre text-creme font-semibold"
    : "bg-white text-encre shadow-[inset_0_0_0_1px_var(--bord)]";

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-sm text-[14px] text-left transition-transform duration-120 active:scale-[0.97] ${stateClasses} ${className}`}
    >
      {label}
    </button>
  );
}
