import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({
  label,
  options,
  id,
  className = "",
  ...rest
}: SelectProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
      )}
      <span className="relative block">
        <select
          id={id}
          className={`w-full cursor-pointer appearance-none rounded-xl border border-line bg-card px-4 py-3 pr-10 text-sm text-ivory shadow-sm transition-[border-color,box-shadow] focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20 ${className}`}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </span>
    </label>
  );
}
