import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const fieldBase =
  "w-full bg-transparent border-0 border-b border-ivory/60 px-0 py-2.5 text-sm text-ivory placeholder:text-muted/60 focus:border-ivory focus:shadow-[0_1px_0_0_var(--color-ivory)] focus:outline-none transition-[border-color,box-shadow]";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = "", ...rest }: InputProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted">
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
        <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted">
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
