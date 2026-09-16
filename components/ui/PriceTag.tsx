import { discountPercent, formatINR } from "@/lib/format";

interface PriceTagProps {
  price: number; // paise
  compareAtPrice?: number | null;
  size?: "sm" | "md" | "lg";
  showDiscount?: boolean;
}

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
};

export function PriceTag({
  price,
  compareAtPrice,
  size = "md",
  showDiscount = false,
}: PriceTagProps) {
  const onSale = compareAtPrice != null && compareAtPrice > price;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={`font-display font-semibold tracking-[-0.02em] text-ivory ${sizes[size]}`}>
        {formatINR(price)}
      </span>
      {onSale && (
        <>
          <span className="text-xs text-muted line-through">
            {formatINR(compareAtPrice)}
          </span>
          {showDiscount && (
            <span className="text-xs font-semibold text-gold">
              {discountPercent(price, compareAtPrice)}% off
            </span>
          )}
        </>
      )}
    </span>
  );
}
