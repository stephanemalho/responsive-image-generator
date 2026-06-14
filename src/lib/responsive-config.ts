export const RESPONSIVE_PRESETS = [
  { label: "mobile", width: 480 },
  { label: "tablet", width: 768 },
  { label: "desktop", width: 1200 },
] as const;

export const OUTPUT_FORMATS = [
  { extension: "avif", format: "avif", quality: 50 },
  { extension: "webp", format: "webp", quality: 78 },
  { extension: "jpeg", format: "jpeg", quality: 82 },
] as const;

export type ResponsivePresetLabel = (typeof RESPONSIVE_PRESETS)[number]["label"];
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]["extension"];
