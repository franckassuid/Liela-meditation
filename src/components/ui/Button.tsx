import React from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-sans font-semibold text-[15px] rounded-sm transition-transform duration-120 active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100";
  
  const variantClasses = {
    primary: "bg-encre text-creme py-[15px] px-6",
    secondary: "bg-transparent text-encre py-[15px] px-6 shadow-[inset_0_0_0_1px_var(--bord)]",
    tertiary: "bg-transparent text-sauge-p py-3 px-1.5",
  };

  const widthClass = fullWidth ? "w-full" : "";

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
