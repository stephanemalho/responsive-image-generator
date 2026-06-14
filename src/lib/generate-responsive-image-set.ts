import sharp from "sharp";

import {
  OUTPUT_FORMATS,
  RESPONSIVE_PRESETS,
  type OutputFormat,
  type ResponsivePresetLabel,
} from "@/lib/responsive-config";

const SERVER_OUTPUT_FORMATS = OUTPUT_FORMATS satisfies ReadonlyArray<{
  extension: string;
  format: keyof sharp.FormatEnum | "avif";
  quality: number;
}>;

export type GeneratedImageFile = {
  format: OutputFormat;
  preset: ResponsivePresetLabel;
  filename: string;
  relativePath: string;
  width: number;
  height: number;
  size: number;
  buffer: Buffer;
};

export type ResponsiveManifest = {
  source: {
    width: number;
    height: number;
    format: string;
  };
  presets: Array<{
    label: ResponsivePresetLabel;
    requestedWidth: number;
    outputWidth: number;
    outputHeight: number;
    warning?: string;
  }>;
  files: Array<Omit<GeneratedImageFile, "buffer">>;
  warnings: string[];
};

export type ResponsiveImageSet = {
  files: GeneratedImageFile[];
  manifest: ResponsiveManifest;
};

export class ImageProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

export async function generateResponsiveImageSet(
  input: Buffer,
  assetName: string,
): Promise<ResponsiveImageSet> {
  const source = sharp(input, { animated: true });
  const metadata = await source.metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new ImageProcessingError("L'image source est illisible.");
  }

  if (!["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ImageProcessingError(
      "Format non supporte. Utilisez JPEG, PNG ou WebP statique.",
    );
  }

  if (metadata.pages && metadata.pages > 1) {
    throw new ImageProcessingError(
      "Les images animees ne sont pas supportees en v1.",
    );
  }

  const sourceWidth = metadata.width;
  const warnings: string[] = [];
  const manifestPresets: ResponsiveManifest["presets"] = [];

  const resizedInputs = await Promise.all(
    RESPONSIVE_PRESETS.map(async (preset) => {
      const outputWidth = Math.min(sourceWidth, preset.width);
      const buffer = await sharp(input)
        .rotate()
        .resize({
          width: outputWidth,
          withoutEnlargement: true,
        })
        .toBuffer();
      const resizedMetadata = await sharp(buffer).metadata();
      const outputHeight = resizedMetadata.height ?? metadata.height;
      const warning =
        outputWidth < preset.width
          ? `Source plus petite que ${preset.width}px: sortie ${preset.label} generee en ${outputWidth}px.`
          : undefined;

      if (warning) {
        warnings.push(warning);
      }

      manifestPresets.push({
        label: preset.label,
        requestedWidth: preset.width,
        outputWidth,
        outputHeight,
        ...(warning ? { warning } : {}),
      });

      return {
        preset,
        buffer,
        width: outputWidth,
        height: outputHeight,
      };
    }),
  );

  const files: GeneratedImageFile[] = [];

  for (const format of SERVER_OUTPUT_FORMATS) {
    for (const resized of resizedInputs) {
      const filename = `${assetName}-${resized.preset.label}.${format.extension}`;
      const outputBuffer = await sharp(resized.buffer)
        .toFormat(format.format, { quality: format.quality })
        .toBuffer();

      files.push({
        format: format.extension,
        preset: resized.preset.label,
        filename,
        relativePath: `${format.extension}/${filename}`,
        width: resized.width,
        height: resized.height,
        size: outputBuffer.byteLength,
        buffer: outputBuffer,
      });
    }
  }

  return {
    files,
    manifest: {
      source: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
      },
      presets: RESPONSIVE_PRESETS.map((preset) => {
        const manifestPreset = manifestPresets.find(
          (item) => item.label === preset.label,
        );

        if (!manifestPreset) {
          throw new ImageProcessingError("Preset manquant dans le manifest.");
        }

        return manifestPreset;
      }),
      files: files.map((file) => ({
        format: file.format,
        preset: file.preset,
        filename: file.filename,
        relativePath: file.relativePath,
        width: file.width,
        height: file.height,
        size: file.size,
      })),
      warnings,
    },
  };
}
