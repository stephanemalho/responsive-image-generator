import JSZip from "jszip";

import type {
  ResponsiveImageSet,
  ResponsiveManifest,
} from "@/lib/generate-responsive-image-set";

export async function createResponsiveImageZip(
  folderName: string,
  imageSet: ResponsiveImageSet,
) {
  const zip = new JSZip();
  const root = zip.folder(folderName);

  if (!root) {
    throw new Error("Impossible de creer le dossier ZIP.");
  }

  for (const file of imageSet.files) {
    root.file(file.relativePath, file.buffer);
  }

  const manifest: ResponsiveManifest = imageSet.manifest;
  root.file("manifest.json", JSON.stringify(manifest, null, 2));

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
