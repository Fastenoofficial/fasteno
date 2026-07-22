import type { SelectHTMLAttributes } from "react";

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
        <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted">
          {label}
        </span>
      )}
      <select
        id={id}
        className={`w-full appearance-none bg-transparent border-0 border-b border-ivory/60 px-0 py-2.5 pr-8 text-sm text-ivory focus:border-ivory focus:shadow-[0_1px_0_0_var(--color-ivory)] focus:outline-none transition-[border-color,box-shadow] cursor-pointer ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
