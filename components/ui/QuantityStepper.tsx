"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  size = "md",
}: QuantityStepperProps) {
  const btn =
    size === "sm" ? "h-8 w-8" : "h-11 w-11";
  const label = size === "sm" ? "w-8 text-sm" : "w-12 text-base";
  return (
    <div className="inline-flex items-center border border-line">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${btn} inline-flex items-center justify-center text-muted transition-colors hover:text-gold disabled:opacity-30 cursor-pointer`}
      >
        <Minus size={14} />
      </button>
      <span className={`${label} text-center font-medium text-ivory`}>
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${btn} inline-flex items-center justify-center text-muted transition-colors hover:text-gold disabled:opacity-30 cursor-pointer`}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
