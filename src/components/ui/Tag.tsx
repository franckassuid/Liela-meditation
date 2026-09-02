import React from "react";

interface TagProps {
  children: React.ReactNode;
  className?: string;
  variant?: "sauge" | "terre" | "default" | "sommeil";
}

export function Tag({ children, className = "", variant = "default" }: TagProps) {
  let variantClasses = "bg-sable text-gris-2";
  
  if (variant === "sauge") {
    variantClasses = "bg-sauge-voile text-sauge-p";
  } else if (variant === "terre") {
    variantClasses = "bg-terre-voile text-terre-p";
  } else if (variant === "sommeil") {
    variantClasses = "bg-[rgba(253,249,240,0.1)] text-creme";
  }

  return (
    <span className={`inline-block text-[12px] font-semibold px-[11px] py-[5px] rounded-xs ${variantClasses} ${className}`}>
      {children}
    </span>
  );
}
