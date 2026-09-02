import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => {
    const errorClass = error
      ? "border-etat-erreur text-etat-erreur focus:border-etat-erreur focus:ring-0"
      : "border-transparent text-gris-3 focus:bg-white focus:border-bord focus:text-encre";

    return (
      <div className="w-full flex flex-col gap-1.5">
        <input
          ref={ref}
          className={`w-full bg-coquille border rounded-sm px-4 py-3.5 font-sans text-[15px] outline-none transition-colors ${errorClass} ${className}`}
          {...props}
        />
        {error && <span className="text-etat-erreur text-[12.5px] px-1 font-semibold">{error}</span>}
      </div>
    );
  }
);
Input.displayName = "Input";
