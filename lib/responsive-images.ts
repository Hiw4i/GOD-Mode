export type ResponsiveImageVariant = {
  src: string;
  width: number;
  height: number;
  bytes: number;
};

export function renderDprCap() {
  if (typeof window === "undefined") return 1;
  const isMobile = window.matchMedia("(max-width: 768px), (hover: none), (pointer: coarse)").matches;
  return Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
}

export function selectImageVariant(variants: readonly ResponsiveImageVariant[], renderedWidth: number, dpr = renderDprCap()) {
  if (variants.length === 0) throw new Error("At least one responsive image variant is required.");
  const targetWidth = Math.max(1, renderedWidth * dpr);
  return variants.find((variant) => variant.width >= targetWidth) ?? variants.at(-1)!;
}

export function variantSrcSet(variants: readonly ResponsiveImageVariant[]) {
  return variants.map((variant) => `${variant.src} ${variant.width}w`).join(", ");
}

export function parseImageVariants(serialized: string | undefined) {
  if (!serialized) return [];
  try {
    const value: unknown = JSON.parse(serialized);
    if (!Array.isArray(value)) return [];
    return value.filter((variant): variant is ResponsiveImageVariant => {
      if (!variant || typeof variant !== "object") return false;
      const candidate = variant as Partial<ResponsiveImageVariant>;
      return typeof candidate.src === "string"
        && typeof candidate.width === "number"
        && typeof candidate.height === "number"
        && typeof candidate.bytes === "number";
    });
  } catch {
    return [];
  }
}
