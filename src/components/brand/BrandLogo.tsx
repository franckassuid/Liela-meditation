import React from "react";

interface BrandLogoProps {
  variant?: "horizontal" | "icon";
  className?: string;
  width?: number;
  height?: number;
}

export function BrandLogo({
  variant = "horizontal",
  className = "",
  width,
  height,
}: BrandLogoProps) {
  const src =
    variant === "icon"
      ? "/brand/liela-icone-app.svg"
      : "/brand/liela-logo-horizontal.svg";
  
  const alt = variant === "icon" ? "Icône Liela" : "Liela";

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      draggable={false}
    />
  );
}
