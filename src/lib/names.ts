export function sanitizeAssetName(value: string, fallback = "image") {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return normalized || fallback;
}

export function filenameStem(filename: string) {
  return filename.replace(/\.[^/.]+$/, "");
}
