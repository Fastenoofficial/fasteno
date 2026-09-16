import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "danger" | "champagne";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border font-medium uppercase tracking-[0.05em] shadow-sm transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 [.on-dark_&]:focus-visible:ring-gold-light disabled:pointer-events-none disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary:
    "border-action bg-action text-white hover:border-action-hover hover:bg-action-hover hover:shadow-md",
  outline:
    "border-line bg-card/70 text-ivory hover:border-ivory/30 hover:bg-card",
  ghost:
    "border-transparent bg-transparent text-ivory shadow-none hover:bg-surface hover:text-gold",
  danger:
    "border-danger/60 bg-transparent text-danger shadow-none hover:bg-danger hover:text-white",
  champagne:
    "border-[#C5A059] bg-[#C5A059] text-[#0D172A] hover:border-[#D2B777] hover:bg-[#D2B777] hover:shadow-md",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 py-2 text-xs",
  md: "min-h-11 px-6 py-2.5 text-sm",
  lg: "min-h-12 px-8 py-3 text-sm",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  href,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
