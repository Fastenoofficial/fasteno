import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  children?: ReactNode; // optional right-side action (e.g. "View all" link)
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  children,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div
      className={`mb-10 flex flex-wrap items-end gap-5 md:mb-12 ${
        centered ? "flex-col items-center text-center" : "justify-between"
      }`}
    >
      <div className={centered ? "flex flex-col items-center" : ""}>
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="font-display text-3xl font-semibold tracking-[-0.035em] text-ivory md:text-4xl">
          {title}
        </h2>
        <div className={`gold-rule mt-4 ${centered ? "mx-auto" : ""}`} />
        {description && (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted md:text-[15px]">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
