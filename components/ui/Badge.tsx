import type { ReactNode } from "react";

type Tone = "gold" | "muted" | "success" | "danger";

const tones: Record<Tone, string> = {
  gold: "border-gold text-gold",
  muted: "border-line text-muted",
  success: "border-success/60 text-success",
  danger: "border-danger/60 text-danger",
};

export function Badge({
  tone = "gold",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
