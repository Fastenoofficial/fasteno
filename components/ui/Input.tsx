import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldBase =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ivory shadow-sm placeholder:text-muted-soft transition-[border-color,box-shadow] focus:border-gold-light focus:outline-none focus:ring-2 focus:ring-gold-light/20";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
      )}
      <input
        id={id}
        className={`${fieldBase} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  id,
  className = "",
  ...rest
}: TextareaProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <label className="block">
      {label && (
        <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
      )}
      <textarea
        id={id}
        className={`${fieldBase} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        {...rest}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  );
}
