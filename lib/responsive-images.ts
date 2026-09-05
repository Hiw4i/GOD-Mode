export type ResponsiveImageVariant = {
  src: string;
  width: number;
  height: number;
  bytes: number;
};

export function variantSrcSet(variants: readonly ResponsiveImageVariant[]) {
  return variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
}
