import JSZip from "jszip";

import type {
  ResponsiveImageSet,
} from "@/lib/generate-responsive-image-set";

export type ResponsiveImageZipEntry = {
  index: number;
  sourceFilename: string;
  assetName: string;
  imageSet: ResponsiveImageSet;
};

export type ResponsiveImageZipManifest = {
  folderName: string;
  imageCount: number;
  images: Array<{
    index: number;
    sourceFilename: string;
    assetName: string;
    source: ResponsiveImageSet["manifest"]["source"];
    presets: ResponsiveImageSet["manifest"]["presets"];
    files: ResponsiveImageSet["manifest"]["files"];
    warnings: string[];
  }>;
  warnings: string[];
};

export async function createResponsiveImageZip(
  folderName: string,
  entries: ResponsiveImageZipEntry[],
) {
  const zip = new JSZip();
  const root = zip.folder(folderName);

  if (!root) {
    throw new Error("Impossible de creer le dossier ZIP.");
  }

  for (const entry of entries) {
    for (const file of entry.imageSet.files) {
      root.file(file.relativePath, file.buffer);
    }
  }

  const manifest: ResponsiveImageZipManifest = {
    folderName,
    imageCount: entries.length,
    images: entries.map((entry) => ({
      index: entry.index,
      sourceFilename: entry.sourceFilename,
      assetName: entry.assetName,
      source: entry.imageSet.manifest.source,
      presets: entry.imageSet.manifest.presets,
      files: entry.imageSet.manifest.files,
      warnings: entry.imageSet.manifest.warnings,
    })),
    warnings: entries.flatMap((entry) =>
      entry.imageSet.manifest.warnings.map(
        (warning) => `${entry.assetName}: ${warning}`,
      ),
    ),
  };

  root.file("manifest.json", JSON.stringify(manifest, null, 2));

  return zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
