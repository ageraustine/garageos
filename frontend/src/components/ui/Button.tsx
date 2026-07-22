// Button component - Single Responsibility: renders styled buttons/links
// Open/Closed: extensible via variant props without modification

import type { ButtonProps } from "@/lib/types";

const variants = {
  primary:
    "bg-gold-500 text-navy-900 hover:bg-gold-400 shadow-lg shadow-gold-500/25 font-semibold",
  secondary: "bg-navy-900 text-white hover:bg-navy-800",
  outline:
    "border-2 border-navy-200 text-navy-900 hover:border-gold-500 hover:bg-gold-50",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  href,
  className = "",
  type = "button",
  disabled = false,
  onClick,
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200";
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";
  const combinedStyles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`;

  if (href) {
    return (
      <a href={href} className={combinedStyles}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={combinedStyles}
    >
      {children}
    </button>
  );
}
