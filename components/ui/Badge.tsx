import type { ReactNode } from "react";

type Tone = "gold" | "muted" | "success" | "danger";

const tones: Record<Tone, string> = {
  gold: "border-gold-light/50 bg-gold-light/15 text-gold",
  muted: "border-line bg-white/85 text-muted",
  success: "border-success/35 bg-success/10 text-success",
  danger: "border-danger/35 bg-danger/10 text-danger",
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
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] backdrop-blur-sm ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
