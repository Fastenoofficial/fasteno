"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
  label?: string;
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  size = "md",
  label = "Quantity",
}: QuantityStepperProps) {
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const valueSize = size === "sm" ? "w-8 text-sm" : "w-12 text-base";
  const lowerLabel = label.charAt(0).toLowerCase() + label.slice(1);

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center rounded-full border border-line bg-card p-0.5 shadow-sm"
    >
      <button
        type="button"
        aria-label={`Decrease ${lowerLabel}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${buttonSize} inline-flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-gold disabled:pointer-events-none disabled:opacity-30`}
      >
        <Minus size={14} aria-hidden />
      </button>
      <output
        aria-live="polite"
        aria-atomic="true"
        className={`${valueSize} text-center font-medium text-ivory`}
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`Increase ${lowerLabel}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${buttonSize} inline-flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-gold disabled:pointer-events-none disabled:opacity-30`}
      >
        <Plus size={14} aria-hidden />
      </button>
    </div>
  );
}
