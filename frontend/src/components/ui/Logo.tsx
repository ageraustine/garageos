import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string;
  className?: string;
  variant?: "light" | "dark";
}

const sizes = {
  sm: { icon: 32, text: "text-lg" },
  md: { icon: 40, text: "text-xl" },
  lg: { icon: 48, text: "text-2xl" },
};

export function Logo({ size = "md", showText = true, href = "/", className = "", variant = "light" }: LogoProps) {
  const { icon, text } = sizes[size];
  const textColor = variant === "dark" ? "text-white" : "text-navy-900";

  const content = (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/garageos-favicon-32.svg"
        alt="GarageOS"
        width={icon}
        height={icon}
        className="flex-shrink-0"
      />
      {showText && (
        <span className={`${text} font-bold ${textColor}`}>GarageOS</span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
